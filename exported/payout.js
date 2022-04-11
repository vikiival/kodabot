    const lib = require('lib')({
        token: process.env.STDLIB_SECRET_TOKEN,
    });
    const moment = require('moment');
    const {Octokit} = require('@octokit/rest');
    const octokit = new Octokit({
        auth: process.env.GITHUB_PERSONAL_KEY,
    });
    const {graphql} = require('@octokit/graphql');
    const settings = require('./settings');
    const shared = require('./shared');
    const btoa = require('btoa');

    module.exports = {

        /**
         * @returns pull request object based on data from GitHub
         * */
        getPullRequest: async (prNumber) => {
            let queryResult = await graphql(
                `
            query getPullRequest($repo: String!, $owner: String!, $prNumber: Int!) {
              repository(name: $repo, owner: $owner) {
                pullRequest(number: $prNumber) {
                  additions
                  author {
                    login
                  }
                  closedAt
                  comments(first: 100) {
                    nodes {
                      body
                    }
                    totalCount
                  }
                  closingIssuesReferences(first: 20) {
                    nodes {
                      number
                    }
                  }
                  deletions
                  commits {
                    totalCount
                  }
                  mergedAt
                  merged
                  number
                  url
                  state
                }
              }
            }
          `,
                {
                    repo: process.env.GITHUB_REPO,
                    owner: process.env.GITHUB_OWNER,
                    prNumber: prNumber,
                    headers: {
                        authorization: `token ${process.env.GITHUB_PERSONAL_KEY}`,
                    },
                }
            );
            queryResult = queryResult.repository.pullRequest
            return {
                prLeaderboard: false,
                prNumber: queryResult.number,
                prAuthor: queryResult.author.login,
                prState: queryResult.state,
                githubLink: queryResult.url,
                transactions: await module.exports.getTransactions(queryResult.comments.nodes),
                prMergedDate: queryResult.mergedAt,
                commits: queryResult.commits.totalCount,
                linesAdded: queryResult.additions,
                linesRemoved: queryResult.deletions,
                commentsCount: queryResult.comments.totalCount,
                linkedIssues: queryResult.closingIssuesReferences.nodes.map((x) => x.number),
            }
        },

        /**
         * @param commentBody body of the concerned comment
         * @returns extrinsic hash
         */
        getHashFromComment: (commentBody) => {
            let hashPart = commentBody.split('https://kusama.subscan.io/extrinsic/')[1]
            return hashPart.substring(0, hashPart.indexOf(')'));
        },

        /**
         * @returns extrinsic payload from Subscan
         * */
        getSubscanResult: async (extrinsicHash) => {
            return await lib.http.request['@1.1.6'].post({
                url: 'https://kusama.api.subscan.io/api/scan/extrinsic',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': `${process.env.SUBSCAN_API}`,
                },
                params: {
                    hash: `${extrinsicHash}`,
                },
            });
        },

        /**
         * @returns price payload from Subscan
         * */
        getSubscanPrice: async (timestamp) => {
            return await lib.http.request['@1.1.6'].post({
                url: 'https://kusama.api.subscan.io/api/open/price',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': `${process.env.SUBSCAN_API}`,
                },
                params: {
                    time: timestamp,
                },
            });
        },

        /**
         * @returns array of transaction with results from Subscan
         * */
        getTransactions: async (comments) => {
            let transactions = []
            let hashArray = []
            comments.forEach(element => {
                if (shared.checks.payoutPhrases(element.body)) {
                    hashArray.push(module.exports.getHashFromComment(element.body))
                }
            })
            for (let i = 0; i < hashArray.length; i++) {
                let subscanResult = await module.exports.getSubscanResult(hashArray[i])
                let blockTimestamp = subscanResult.data.data.block_timestamp
                let ksmAmount = parseFloat(subscanResult.data.data.transfer.amount)
                let conversionRate = (await module.exports.getSubscanPrice(blockTimestamp)).data.data.price
                if (subscanResult) {
                    transactions.push({
                        transactionResult: subscanResult.data.data.success,
                        paidUsd: subscanResult.data.data.success ? module.exports.roundTwoDecimals(ksmAmount * conversionRate) : 0,
                        paidKsm: subscanResult.data.data.success ? module.exports.roundThreeDecimals(ksmAmount) : 0,
                        subscanLink: `https://kusama.subscan.io/extrinsic/${hashArray[i]}`,
                        subscanHash: hashArray[i]
                    })
                }
            }
            return transactions
        },

        /**
         * @returns total amount paid in USD for pull request.
         * @param pullObject  stored on CF
         */
        getAmountUsdFromPullObject: (pullObject) => {
            let amountUsd = 0;
            for (let i = 0; i < pullObject.transactions.length; i++) {
                if (pullObject.transactions[i].transactionResult === true) {
                    amountUsd += pullObject.transactions[i].paidUsd;
                }
            }
            return amountUsd;
        },

        /**
         * @returns total amount paid in KSM for pull request.
         * @param pullObject PR object stored on CF
         */
        getAmountKsmFromPullObject: (pullObject) => {
            let amountKsm = 0;
            for (let i = 0; i < pullObject.transactions.length; i++) {
                if (pullObject.transactions[i].transactionResult === true) {
                    amountKsm += pullObject.transactions[i].paidKsm;
                }
            }
            return amountKsm;
        },

        /**
         * @desc merges main into bot branch
         * */
        updateBotBranch: async (pullNumber, sha) => {
            return await octokit.request(
                'PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch',
                {
                    owner: process.env.GITHUB_OWNER,
                    repo: process.env.GITHUB_REPO,
                    pull_number: pullNumber,
                    expected_head_sha: sha,
                }
            );
        },

        /**
         * @desc creates pull request from bot branch to main
         * */
        createPullRequestForBot: async () => {
            return await octokit.request('POST /repos/{owner}/{repo}/pulls', {
                owner: process.env.GITHUB_OWNER,
                repo: process.env.GITHUB_REPO,
                head: settings.branchName,
                base: 'main',
                title: settings.pullRequestTitle,
            });
        },

        /**
         * @returns SHA key for LEADERBOARD.MD file on GH
         * @desc URL needs to be adjusted in settings
         */
        getLeaderboardKey: async () => {
            const queryResult = await graphql(
                `
    query getLeaderboardKey($owner: String!, $repo: String!, $gitPath: String!) {
      repository(owner: $owner, name: $repo) {
        object(expression: $gitPath) {
          ... on Blob {
            oid
          }
        }
      }
    }
          `,
                {   repo: process.env.GITHUB_REPO,
                    owner: process.env.GITHUB_OWNER,
                    gitPath: settings.gitPath,
                    headers: {
                        authorization: `token ${process.env.GITHUB_PERSONAL_KEY}`,
                    },
                }
            );
            return queryResult.repository.object.oid;
        },

        /**
         *@desc Pushes updated LEADERBOARD.MD to branch, creates pull request to main and updates PR from main
         */
        pushLeaderboard: async (mdTable) => {
            const sha = await module.exports.getLeaderboardKey();
            let newSha = await octokit.request(
                'PUT /repos/{owner}/{repo}/contents/{path}',
                {
                    owner: process.env.GITHUB_OWNER,
                    repo: process.env.GITHUB_REPO,
                    path: 'LEADERBOARD.MD',
                    message: settings.pullRequestTitle,
                    content: btoa(mdTable),
                    sha,
                    branch: settings.branchName,
                }
            );
            let newPull = await module.exports.createPullRequestForBot();
            return await module.exports.updateBotBranch(
                newPull.data.number,
                newSha.data.commit.sha
            );
        },

        /**
         * @returns leaderboard array stored in CF KV storage
         * */
        getLeaderboard: async () => {
            let leaderboard = JSON.parse(
                (
                    await lib.http.request['@1.1.6']({
                        method: 'GET',
                        url: shared.makeUrl(process.env.CLDFLR_TABLES, 'leaderboard'),
                        headers: {
                            'X-Auth-Email': process.env.CLDFLR_EMAIL,
                            'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
                        },
                    })
                ).body.toString()
            );
            if (leaderboard.result === null) {
                leaderboard = [];
            }
            return leaderboard;
        },

        /**
         * @desc Stores leaderboard array in CF KV storage
         * */
        storeLeaderboard: async (leaderboard) => {
            await lib.http.request['@1.1.6']({
                method: 'PUT',
                url: shared.makeUrl(process.env.CLDFLR_TABLES, 'leaderboard'),
                headers: {
                    'X-Auth-Email': process.env.CLDFLR_EMAIL,
                    'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
                },
                body: JSON.stringify(leaderboard),
            });
        },

        /**
         * @desc replaces old leaderboard record with updated one
         * @returns updated sorted leaderboard
         * */
        replaceLeaderboardRecord: async (
            leaderboard,
            storedPull,
            leaderboardRecord
        ) => {
            for (let i = 0; i < leaderboard.length; i++) {
                if (leaderboard[i].devLogin === storedPull.prAuthor) {
                    leaderboard.splice(i, 1);
                }
            }
            let newLeaderboardRecord = await module.exports.updateLeaderboardRecord(
                storedPull,
                leaderboardRecord
            );
            leaderboard.push(newLeaderboardRecord);
            leaderboard.sort(
                (a, b) => b.totalAmountReceivedUSD - a.totalAmountReceivedUSD
            );
            await module.exports.storeLeaderboard(leaderboard);
            return leaderboard
        },

        /**
         * @desc Updates leaderboard object stored in CF KV storage
         * @returns leaderboard sorted by total amount earned in USD
         * */
        updateLeaderboard: async (pullRequest, leaderboard) => {
            pullRequest.prLeaderboard = true;
            let leaderboardRecord = leaderboard.find(
                (obj) => obj.devLogin === pullRequest.prAuthor
            );
            if (shared.checks.missingFromLeaderboard(leaderboardRecord)) {
                leaderboard.push(
                    await module.exports.makeLeaderboardRecord(pullRequest)
                );
            } else {
                leaderboard = await module.exports.replaceLeaderboardRecord(
                    leaderboard,
                    pullRequest,
                    leaderboardRecord
                );
            }
            await shared.storePullObject(pullRequest, pullRequest.prNumber);
            await module.exports.storeLeaderboard(leaderboard);
        },

        /**
         * @desc Generates new entry into leaderboard stored on CF KV storage
         * */
        makeLeaderboardRecord: async (storedPull) => {
            let prMerged = storedPull.prState === 'MERGED';
            let dollarValue = 0;
            let kusamaValue = 0;
            let linkToLastSubscan = null;
            for (let i = 0; i < storedPull.transactions.length; i++) {
                const oneTransaction = storedPull.transactions[i];
                if (oneTransaction.transactionResult === true) {
                    dollarValue += oneTransaction.paidUsd;
                    kusamaValue += oneTransaction.paidKsm;
                    linkToLastSubscan = oneTransaction.subscanLink;
                }
            }
            return {
                devLogin: storedPull.prAuthor,
                totalAmountReceivedUSD: module.exports.roundTwoDecimals(dollarValue),
                totalAmountReceivedKSM: module.exports.roundThreeDecimals(kusamaValue),
                numberOfOpenPrs: 1,
                mergedPrs: prMerged ? 1 : 0,
                closedPrs: prMerged ? 0 : 1,
                linesAdded: prMerged ? storedPull.linesAdded : 0,
                linesRemoved: prMerged ? storedPull.linesRemoved : 0,
                numOfTotalCommitsMerged: prMerged ? storedPull.commits : 0,
                linkToLastSubscan,
                lastMergedPrDate: prMerged ? storedPull.prMergedDate : null,
                commentsCount: storedPull.commentsCount,
                numOfLinkedIssues: storedPull.linkedIssues.length,
            };
        },

        /**
         * @desc Updates one leaderboard record stored
         * */
        updateLeaderboardRecord: async (storedPull, leaderboardRecord) => {
            let prMerged = storedPull.prState === 'MERGED';
            prMerged
                ? (leaderboardRecord.mergedPrs += 1)
                : (leaderboardRecord.closedPrs += 1);
            leaderboardRecord.numberOfOpenPrs += 1;
            leaderboardRecord.commentsCount += storedPull.commentsCount;
            leaderboardRecord.numOfLinkedIssues += storedPull.linkedIssues.length;
            for (let i = 0; i < storedPull.transactions.length; i++) {
                const oneTransaction = storedPull.transactions[i];
                if (oneTransaction.transactionResult === true) {
                    if (shared.checks.newMergeDate(leaderboardRecord, storedPull)) {
                        leaderboardRecord.linkToLastSubscan = oneTransaction.subscanLink;
                    }
                    leaderboardRecord.totalAmountReceivedUSD += oneTransaction.paidUsd;
                    leaderboardRecord.totalAmountReceivedKSM += oneTransaction.paidKsm;
                }
            }
            if (prMerged) {
                leaderboardRecord.linesAdded += storedPull.linesAdded;
                leaderboardRecord.linesRemoved += storedPull.linesRemoved;
                leaderboardRecord.numOfTotalCommitsMerged += storedPull.commits;
                if (shared.checks.newMergeDate(leaderboardRecord, storedPull)) {
                    leaderboardRecord.lastMergedPrDate = storedPull.prMergedDate;
                }
            }
            return leaderboardRecord;
        },

        /**
         * @desc used for edge case, where leaderboard was updated after merge but then another transaction was added to the last pull
         * @returns updated leaderboard*/
        fixLeaderboard: async (leaderboard, pullRequest) => {
            let leaderboardRecord = leaderboard.find(
                (obj) => obj.devLogin === pullRequest.prAuthor
            );
            let prMerged = pullRequest.prState === 'MERGED';
            leaderboardRecord.totalAmountReceivedKSM -=
                module.exports.getAmountKsmFromPullObject(pullRequest);
            leaderboardRecord.totalAmountReceivedUSD -=
                module.exports.getAmountKsmFromPullObject(pullRequest);
            leaderboardRecord.numberOfOpenPrs -= 1;
            leaderboardRecord.mergedPrs -= prMerged ? 1 : 0;
            leaderboardRecord.closedPrs -= prMerged ? 0 : 1;
            leaderboardRecord.linesAdded -= prMerged ? pullRequest.linesAdded : 0;
            leaderboardRecord.linesRemoved -= prMerged ? pullRequest.linesRemoved : 0;
            leaderboardRecord.numOfTotalCommitsMerged -= prMerged
                ? pullRequest.commits
                : 0;
            leaderboardRecord.commentsCount -= pullRequest.commentsCount;
            leaderboardRecord.numOfLinkedIssues -= pullRequest.linkedIssues.length;
            pullRequest = await module.exports.getPullRequest(pullRequest.prNumber)
            pullRequest.prLeaderboard = true
            await shared.storePullObject(pullRequest, pullRequest.prNumber)
            // let prPaid = module.exports.getAmountUsdFromPullObject(pullRequest) > 0;
            // if (prMerged && prPaid) {
            //     let mergedAndPaid = await shared.getDataAc(settings.mergedAndPaid);
            //     if (!mergedAndPaid.includes(pullRequest.prNumber)) {
            //         mergedAndPaid.push(pullRequest.prNumber);
            //         await shared.storeDataAc(settings.mergedAndPaid, mergedAndPaid);
            //     }
            // }
            await module.exports.replaceLeaderboardRecord(
                leaderboard,
                pullRequest,
                leaderboardRecord
            );
        },

        /**
         * @returns MD version of leaderboard
         * */
        makeLeaderboardMd: async (leaderboard) => {
            let numOfPRs = (await shared.getAllKeys(process.env.CLDFLR_PULLS)).length;
            let mdTable = module.exports.tableHeader;
            for (let i = 0; i < leaderboard.length; i++) {
                const oneRecord = leaderboard[i];
                if (oneRecord.totalAmountReceivedUSD <= 0) {
                    continue;
                }
                mdTable += module.exports.makeLeaderboardRecordMd(
                    oneRecord.devLogin,
                    oneRecord
                );
            }
            mdTable += module.exports.tableFooter(
                moment().format('MMM Do YYYY'),
                numOfPRs
            );
            return mdTable;
        },

        /**
         * @desc Generates one line of .md  version of leaderboard.
         * */
        makeLeaderboardRecordMd: (devLogin, leaderboardRecord) => {
            let mdRow = [
                devLogin,
                module.exports.roundTwoDecimals(leaderboardRecord.totalAmountReceivedUSD),
                module.exports.roundThreeDecimals(leaderboardRecord.totalAmountReceivedKSM),
                module.exports.roundTwoDecimals(leaderboardRecord.totalAmountReceivedUSD / leaderboardRecord.mergedPrs),
                leaderboardRecord.numberOfOpenPrs,
                leaderboardRecord.mergedPrs,
                leaderboardRecord.closedPrs,
                leaderboardRecord.linesAdded,
                leaderboardRecord.linesRemoved,
                leaderboardRecord.numOfTotalCommitsMerged,
                leaderboardRecord.commentsCount,
                module.exports.roundTwoDecimals(leaderboardRecord.commentsCount / leaderboardRecord.numberOfOpenPrs),
                leaderboardRecord.numOfLinkedIssues,
                leaderboardRecord.numberOfOpenPrs,
                leaderboardRecord.linkToLastSubscan
            ]
            return `| ${mdRow[0]} | $${mdRow[1]}/${mdRow[2]}KSM | $${mdRow[3]} | ${mdRow[4]} | ${mdRow[5]} | ${mdRow[6]} | ${mdRow[7]}/${mdRow[8]} | ${mdRow[9]} | ${mdRow[10]} | ${mdRow[11]} | ${mdRow[12]}/${mdRow[13]} |[Link to last transaction](${mdRow[14]}) |\n`
        },

        tableHeader: `| devName | total amount received |  amount per merged PR | total open PRs | merged PRs | closed PRs | lines added to lines removed| commits merged | total # comments | comments per PR | resolved issues to # of open PR | last transaction  |
    |-|-|-|-|-|-|-|-|-|-|-|-|  \n`,

        tableFooter: (date, numOfPRs) => {
            return `\n \n **LEADERBOARD TABLE GENERATED AT ${date} FROM ${numOfPRs} PULL REQUESTS MADE BY CONTRIBUTIONS TO KODADOT**`;
        },

        /**
         @desc Record streak of finished issues within 7 days time. Streak is recorded in devObject on Cloudflare KV storage.
         Function to create comment about record streak is commented off by default. Result is shown only in logs of payout_commentCreated.js
         @param storedIssue temp issue object stored on AC
         @param devObject dev object stored on CF
         @param issueNumber number of issue
         @param prNumber number of PR
         @param amount of USD paid for PR
         @example
         {
            timeOfAssignment: time of assignment,
            prPaidTime: time of payment received ,
            issueNumber: issue number,
            prNumber: PR number,
            amountUsd: amount received ,
         }
         */
        recordFinishedStreak: async (
            storedIssue,
            devObject,
            issueNumber,
            prNumber,
            amount
        ) => {
            if (!shared.checks.storedIssueExists(storedIssue)) {
                return;
            }
            let amountUsdForPr = amount !== undefined ? amount : 0;
            if (amountUsdForPr === 0) {
                return;
            }
            if (devObject.finishedStreak === []) {
                devObject.finishedStreak.push({
                    timeOfAssignment: storedIssue.timeOfAssignment,
                    prPaidTime: moment().format(),
                    issueNumber,
                    prNumber,
                    amountUsd: amountUsdForPr,
                });
            } else {
                if (shared.checks.isInFinishedStreak(devObject, prNumber)) {
                    devObject = await module.exports.fixFinishedStreak(devObject, prNumber, amount)
                } else {
                    devObject.finishedStreak.push({
                        timeOfAssignment: storedIssue.timeOfAssignment,
                        prPaidTime: moment().format(),
                        issueNumber,
                        prNumber,
                        amountUsd: amountUsdForPr,
                    });
                }
            }
            for (let i = 0; i < devObject.finishedStreak.length; i++) {
                if (
                    moment(devObject.finishedStreak[i].timeOfAssignment).add(7, 'days') <
                    moment()
                ) {
                    devObject.finishedStreak.splice(i, 1);
                }
            }

            if (devObject.finishedStreak.length >= settings.finishedStreakLimit) {
                const partialComment = module.exports.payoutMultiplierPartialComment(
                    devObject.finishedStreak
                );
                console.log(
                    settings.comments.payoutMultiplier(
                        storedIssue.assignee,
                        devObject.finishedStreak,
                        partialComment
                    )
                );
                // UNCOMMENT code below in order to start using streaks live, they will currently post info about streak under third in a row and post "pay XYZ usd" comment for other bot to pick up. otherwise, this function stays only in logs.
                // await shared.createComment(
                //     issueNumber,
                //     settings.comments.payoutMultiplier(
                //         storedIssue.assignee,
                //         devObject.finishedStreak,
                //         partialComment
                //     )
                // );
                // await shared.createComment(
                //     issueNumber,
                //     settings.comments.streakMessageForOtherBot(
                //         module.exports.totalAmountUsd(devObject.finishedStreak)
                //     )
                // );
                devObject.finishedStreak = []; //once streak has been hit, it's going to delete itself
            }
            await shared.storeDevObject(devObject, storedIssue.assignee);
        },

        /**
         * @returns true if FinishedStreak was fixed
         */
        fixFinishedStreak: async (devObject, prNumber, amount) => {
            for (let i = 0; i < devObject.finishedStreak.length; i++) {
                if (devObject.finishedStreak[i].prNumber === prNumber) {
                    devObject.finishedStreak[i].amountUsd = amount;
                    break
                }
            }
            return devObject
        },

        /**
         * @returns total amount earned in one finished streak
         * @param finishedStreak array of object stored within devObject
         * */
        totalAmountUsd: (finishedStreak) => {
            let totalAmountUsd = 0;
            for (let i = 0; i < finishedStreak.length; i++) {
                totalAmountUsd += finishedStreak[i].amountUsd;
            }
            return totalAmountUsd;
        },

        /**
         * @returns part of generated comment based on current saved streak.
         * @param finishedStreak array of objects used to track finished issues in less than 7 days from assignment
         */
        payoutMultiplierPartialComment: (finishedStreak) => {
            let partialComment = '';
            let totalAmountUsd = module.exports.totalAmountUsd(finishedStreak);
            for (let i = 0; i < finishedStreak.length; i++) {
                partialComment += `\n Issue #${
                    finishedStreak[i].issueNumber
                } assigned ${moment(finishedStreak[i].timeOfAssignment).format(
                    settings.dateFormat
                )}\n`;
            }
            partialComment += `\n \n For total of $${module.exports.roundTwoDecimals(totalAmountUsd)}. Multiplied by factor of 1.5, user should be paid extra $${
                module.exports.roundTwoDecimals(totalAmountUsd * 1.5 - totalAmountUsd)
            }.`;
            return partialComment;
        },

        roundTwoDecimals: (number) => {
            return Math.round((number + Number.EPSILON) * 100) / 100
        },

        roundThreeDecimals: (number) => {
            return Math.round((number + Number.EPSILON) * 1000) / 1000
        },

        getLinkedIssue: (pullRequest) => {
            if (pullRequest.linkedIssues.length === 0) {
                return 0
            } else {
                return pullRequest.linkedIssues[0]
            }
        }
    };
