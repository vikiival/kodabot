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
    getPullRequest: async (prNumber, ghObject) => {
        let queryResult = await graphql(shared.queries.getPullRequest,
            {
                repo: process.env.GH_REPO,
                owner: process.env.GH_OWNER,
                prNumber: prNumber,
                headers: {
                    authorization: `token ${process.env.GH_KEY}`,
                },
            }
        );
        queryResult = queryResult.repository.pullRequest
        let transactions = []
        return {
            prLeaderboard: true,
            prNumber: queryResult.number,
            prAuthor: queryResult.author.login,
            prState: queryResult.state,
            githubLink: queryResult.url,
            transactions: transactions,
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
        if (hashArray.length > 0) {
            for (let i = 0; i < hashArray.length; i++) {
                let subscanResult = await module.exports.getSubscanResult(hashArray[i])
                let blockTimestamp = subscanResult.data.data.block_timestamp
                let ksmAmount = parseFloat(subscanResult.data.data.transfer.amount)
                let conversionRate = (await module.exports.getSubscanPrice(blockTimestamp)).data.data.price
                if (subscanResult) {
                    transactions.push({
                        transactionSuccess: subscanResult.data.data.success,
                        paidUsd: subscanResult.data.data.success ? module.exports.roundTwoDecimals(ksmAmount * conversionRate) : 0,
                        paidKsm: subscanResult.data.data.success ? module.exports.roundThreeDecimals(ksmAmount) : 0,
                        subscanLink: `https://kusama.subscan.io/extrinsic/${hashArray[i]}`,
                        subscanHash: hashArray[i]
                    })
                }
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
            if (pullObject.transactions[i].transactionSuccess === true) {
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
            if (pullObject.transactions[i].transactionSuccess === true) {
                amountKsm += pullObject.transactions[i].paidKsm;
            }
        }
        return amountKsm;
    },

    roundTwoDecimals: (number) => {
        return Math.round((number + Number.EPSILON) * 100) / 100
    },

    roundThreeDecimals: (number) => {
        return Math.round((number + Number.EPSILON) * 1000) / 1000
    },

    getLinkedIssues: (pullRequest) => {
        if (pullRequest.linkedIssues.length === 0) {
            return []
        } else {
            return pullRequest.linkedIssues
        }
    },

    updateTables: async (leaderboard, burnRate) => {
        await module.exports.pushTable(leaderboard, settings.leaderboardPath, settings.leaderboardFile, settings.leaderboardTitle)
        let lastCommitSha = await module.exports.pushTable(burnRate, settings.burnRatePath, settings.burnRateFile, settings.burnRateTitle)
        let newPull = await module.exports.createPullRequestForBot(settings.tablesTitle);
        return await module.exports.updateBotBranch(
            newPull.data.number,
            lastCommitSha.data.commit.sha
        );
    },

    /**
     * @desc merges main into bot branch
     * */
    updateBotBranch: async (pullNumber, sha, ghObject) => {
        return await octokit.request(
            'PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch',
            {
                owner: ghObject.owner,
                repo: ghObject.repo,
                pull_number: pullNumber,
                expected_head_sha: sha,
            }
        );
    },

    /**
     * @desc creates pull request from bot branch to main
     * */
    createPullRequestForBot: async (title, ghObject) => {
        return await octokit.request('POST /repos/{owner}/{repo}/pulls', {
            owner: ghObject.owner,
            repo: ghObject.repo,
            head: settings.branchName,
            base: 'main',
            title: title,
        });
    },

    /**
     * @returns SHA key for table.md file on GH
     * @desc URL needs to be adjusted in settings
     */
    getShaKey: async (gitPath, ghObject) => {
        const queryResult = await graphql(shared.queries.getTableKey,
            {
                repo: ghObject.repo,
                owner: ghObject.owner,
                gitPath: gitPath,
                headers: {
                    authorization: `token ${process.env.GITHUB_PERSONAL_KEY}`,
                },
            }
        );
        return queryResult.repository.object.oid;
    },

    /**
     * @desc Pushes updated table to branch
     * @returns information about commit, including SHA
     */
    pushTable: async (mdTable, gitPath, fileName, title, ghObject) => {
        const sha = await module.exports.getShaKey(gitPath);
        return await octokit.request(
            'PUT /repos/{owner}/{repo}/contents/{path}',
            {
                owner: ghObject.owner,
                repo: ghObject.repo,
                path: fileName,
                message: title,
                content: btoa(mdTable),
                sha,
                branch: settings.branchName,
            }
        );
    },

    leaderboard: {
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
            let newLeaderboardRecord = await module.exports.leaderboard.updateLeaderboardRecord(
                storedPull,
                leaderboardRecord
            );
            leaderboard.push(newLeaderboardRecord);
            leaderboard.sort(
                (a, b) => b.totalAmountReceivedUSD - a.totalAmountReceivedUSD
            );
            await shared.storeDataCf(process.env.CLDFLR_TABLES, 'leaderboard', leaderboard);
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
                    await module.exports.leaderboard.makeLeaderboardRecord(pullRequest)
                );
            } else {
                leaderboard = await module.exports.leaderboard.replaceLeaderboardRecord(
                    leaderboard,
                    pullRequest,
                    leaderboardRecord
                );
            }
            await shared.storeDataCf(process.env.CLDFLR_PULLS, pullRequest.prNumber, pullRequest);
            await shared.storeDataCf(process.env.CLDFLR_TABLES, 'leaderboard', leaderboard);
        },

        /**
         * @desc Generates new entry into leaderboard stored on CF KV storage
         * */
        makeLeaderboardRecord: async (storedPull) => {
            let prMerged = storedPull.prState === 'MERGED';
            return {
                devLogin: storedPull.prAuthor,
                totalAmountReceivedUSD: module.exports.roundTwoDecimals(module.exports.getAmountUsdFromPullObject(storedPull)),
                totalAmountReceivedKSM: module.exports.roundThreeDecimals(module.exports.getAmountKsmFromPullObject(storedPull)),
                numberOfOpenPrs: 1,
                mergedPrs: prMerged ? 1 : 0,
                closedPrs: prMerged ? 0 : 1,
                linesAdded: prMerged ? storedPull.linesAdded : 0,
                linesRemoved: prMerged ? storedPull.linesRemoved : 0,
                numOfTotalCommitsMerged: prMerged ? storedPull.commits : 0,
                linkToLastSubscan: storedPull.transactions[0] ? storedPull.transactions[0].subscanLink : null,
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
            leaderboardRecord.numberOfOpenPrs += 1;
            leaderboardRecord.commentsCount += storedPull.commentsCount;
            leaderboardRecord.numOfLinkedIssues += storedPull.linkedIssues.length;
            leaderboardRecord.totalAmountReceivedUSD += module.exports.roundTwoDecimals(module.exports.getAmountUsdFromPullObject(storedPull));
            leaderboardRecord.totalAmountReceivedKSM += module.exports.roundThreeDecimals(module.exports.getAmountKsmFromPullObject(storedPull));
            if (shared.checks.newMergeDate(leaderboardRecord, storedPull)) {
                leaderboardRecord.lastMergedPrDate = storedPull.prMergedDate;
                if (storedPull.transactions[0].transactionSuccess === true) {
                    leaderboardRecord.linkToLastSubscan = storedPull.transactions[0].subscanLink;
                }
            }
            if (prMerged) {
                leaderboardRecord.linesAdded += storedPull.linesAdded;
                leaderboardRecord.linesRemoved += storedPull.linesRemoved;
                leaderboardRecord.numOfTotalCommitsMerged += storedPull.commits;
                leaderboardRecord.mergedPrs += 1
            } else {
                leaderboardRecord.closedPrs += 1
            }
            return leaderboardRecord;
        },

        /**
         * @desc used for edge case, where leaderboard was updated after merge but then another transaction was added to the last pull
         * @returns updated leaderboard*/
        fixLeaderboard: async (leaderboard, pullRequest, newPullRequest) => {
            let leaderboardRecord = leaderboard.find(
                (obj) => obj.devLogin === pullRequest.prAuthor
            );
            leaderboardRecord.totalAmountReceivedUSD -= module.exports.getAmountUsdFromPullObject(pullRequest)
            leaderboardRecord.totalAmountReceivedKSM -= module.exports.getAmountKsmFromPullObject(pullRequest)
            leaderboardRecord.totalAmountReceivedUSD += module.exports.getAmountUsdFromPullObject(newPullRequest)
            leaderboardRecord.totalAmountReceivedKSM += module.exports.getAmountKsmFromPullObject(newPullRequest)
            leaderboardRecord.linkToLastSubscan = newPullRequest.transactions[0].subscanLink
            await shared.storeDataCf(process.env.CLDFLR_TABLES, 'leaderboard', leaderboard);
        },

        /**
         * @returns number of pull request for selected query (MERGED/CLOSED/OPEN)
         * @param query - graphql query to get total count of desired PR state
         * @param ghObject
         */
        getNumberOfPullRequests: async (query, ghObject) => {
            const queryResult = await graphql(query,
                {
                    name: ghObject.repo,
                    owner: ghObject.owner,
                    headers: {
                        authorization: `token ${process.env.GITHUB_PERSONAL_KEY}`,
                    },
                }
            );
            return queryResult.repository.pullRequests.totalCount;
        },

        /**
         * @returns MD version of leaderboard
         * */
        makeLeaderboardMd: async (leaderboard) => {
            let closedPullRequests = await module.exports.leaderboard.getNumberOfPullRequests(shared.queries.closedPullRequestsCount);
            let mergedPullRequests = await module.exports.leaderboard.getNumberOfPullRequests(shared.queries.mergedPullRequestsCount);
            let mdTable = module.exports.leaderboard.tableHeader;
            for (let i = 0; i < leaderboard.length; i++) {
                const oneRecord = leaderboard[i];
                if (oneRecord.totalAmountReceivedUSD <= 0) {
                    continue;
                }
                if (settings.payRolledUsers.includes(oneRecord.devLogin)) {
                    continue;
                }
                mdTable += module.exports.leaderboard.makeLeaderboardRecordMd(
                    oneRecord.devLogin,
                    oneRecord
                );
            }
            mdTable += module.exports.leaderboard.tableFooter(
                moment().format('MMM Do YYYY'),
                mergedPullRequests,
                closedPullRequests
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
|-----------------|-----------------------|----------------------|----------------|------------|------------|------------------------------|----------------|------------------|-----------------|---------------------------------|-----------------|  \n`,

        tableFooter: (date, mergedPullRequests, closedPullRequests) => {
            return `\n \n **LEADERBOARD TABLE GENERATED AT ${date} FROM ${mergedPullRequests} MERGED AND ${closedPullRequests} CLOSED PULL REQUESTS MADE BY CONTRIBUTIONS TO KODADOT**`;
        }
    },

    finishedStreak: {
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
                    devObject = await module.exports.finishedStreak.fixFinishedStreak(devObject, prNumber, amount)
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
                const partialComment = module.exports.finishedStreak.payoutMultiplierPartialComment(
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
                //         module.exports.finishedStreak.totalAmountUsd(devObject.finishedStreak)
                //     )
                // );
                devObject.finishedStreak = []; //once streak has been hit, it's going to delete itself
            }
            await shared.storeDataCf(process.env.CLDFLR_DEVS, storedIssue.assignee, devObject);
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

        payoutMultiplierPartialComment: (finishedStreak) => {
            let partialComment = '';
            let totalAmountUsd = module.exports.finishedStreak.totalAmountUsd(finishedStreak);
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
    },

    burnRate: {
        createRecord: (pullRequest, period) => {
            let burnObject = {}
            if (period === 'week') {
                burnObject.week = parseInt(moment(pullRequest.prMergedDate).format('w'))
                burnObject.date = moment(pullRequest.prMergedDate).endOf('week').format('YYYY-MM-DD hh:mm');

            }
            if (period === 'month') {
                burnObject.month = parseInt(moment(pullRequest.prMergedDate).format('M'))
                burnObject.date = moment(pullRequest.prMergedDate).endOf('month').format('YYYY-MM-DD hh:mm');

            }
            let amount = module.exports.getAmountUsdFromPullObject(pullRequest)
            burnObject.numberOfPaidPullRequests = 1
            burnObject.amountPaid = amount
            burnObject.numberOfPaidIssues = pullRequest.linkedIssues.length
            burnObject.numberOfPeopleInvolved = 1
            burnObject.avgPaidPr = amount
            burnObject.peopleInvolved = [pullRequest.prAuthor]
            return burnObject
        },
        updateRecord: (burnRecord, pullRequest) => {
            burnRecord.numberOfPaidPullRequests += 1
            burnRecord.amountPaid += module.exports.getAmountUsdFromPullObject(pullRequest)
            burnRecord.numberOfPaidIssues += pullRequest.linkedIssues.length
            burnRecord.numberOfPeopleInvolved += 1
            burnRecord.avgPaidPr = burnRecord.amountPaid / burnRecord.numberOfPaidPullRequests
            if (!burnRecord.peopleInvolved.includes(pullRequest.prAuthor)) {
                burnRecord.peopleInvolved.push(pullRequest.prAuthor)
            }
            burnRecord.numberOfPeopleInvolved = burnRecord.peopleInvolved.length
            return burnRecord
        },
        updateBurnRate: async (pullRequest, burnRate) => {
            let weekAlreadyIn = false
            let monthAlreadyIn = false
            for (let i = 0; i < burnRate.length; i++) {
                if (parseInt(burnRate[i].week) === parseInt(moment(pullRequest.prMergedDate).format('W'))) {
                    weekAlreadyIn = true
                    burnRate[i] = module.exports.burnRate.updateRecord(burnRate[i], pullRequest)
                }

                if (parseInt(burnRate[i].month) === parseInt(moment(pullRequest.prMergedDate).format('M'))) {
                    monthAlreadyIn = true
                    burnRate[i] = module.exports.burnRate.updateRecord(burnRate[i], pullRequest)
                }
            }
            if (!weekAlreadyIn) {
                burnRate.push(module.exports.burnRate.createRecord(pullRequest, 'week'))
            }
            if (!monthAlreadyIn) {
                burnRate.push(module.exports.burnRate.createRecord(pullRequest, 'month'))
            }
            burnRate.sort(
                (a, b) => moment(b.date) - moment(a.date)
            );
            await shared.storeDataCf(process.env.CLDFLR_TABLES, 'burnRate', burnRate)
            return burnRate
        },
        /**
         * @desc used for edge case, where leaderboard was updated after merge but then another transaction was added to the last pull
         * @returns updated leaderboard*/
        fixBurnRate: async (burnRate, pullRequest, newPullRequest) => {
            let weekRecord = burnRate.find(
                (obj) => parseInt(obj.week) === parseInt(moment(pullRequest.prMergedDate).format('W'))
            );
            let monthRecord = burnRate.find(
                (obj) => parseInt(obj.month) === parseInt(moment(pullRequest.prMergedDate).format('M'))
            );
            weekRecord.amountPaid -= module.exports.getAmountUsdFromPullObject(pullRequest)
            weekRecord.amountPaid += module.exports.getAmountUsdFromPullObject(newPullRequest)
            weekRecord.avgPaidPr = weekRecord.amountPaid / weekRecord.numberOfPaidPullRequests
            monthRecord.amountPaid -= module.exports.getAmountUsdFromPullObject(pullRequest)
            monthRecord.amountPaid += module.exports.getAmountUsdFromPullObject(newPullRequest)
            monthRecord.avgPaidPr = monthRecord.amountPaid / monthRecord.numberOfPaidPullRequests
            await shared.storeDataCf(process.env.CLDFLR_TABLES, 'burnRate', burnRate)
        },
        makeBurnRateMdTable: (burnRate) => {
            let mdTable = module.exports.burnRate.burnRateHeaderMd
            for (let i = 0; i < burnRate.length; i++) {
                mdTable += module.exports.burnRate.makeBurnRateRecordMd(burnRate[i])
            }
            mdTable += module.exports.burnRate.burnRateFooterMd(module.exports.burnRate.getTotalPaidPullRequests(burnRate), module.exports.burnRate.getTotalPeopleInvolved(burnRate))
            return mdTable
        },
        makeBurnRateRecordMd: (record) => {
            if (record.month !== undefined) {
                return `| :date: ***${`${moment(record.date).format('MMMM')} ${moment(record.date).year()}`}*** | ***${record.numberOfPaidPullRequests}*** | ***$${Math.round(record.amountPaid)}*** | ***${record.numberOfPeopleInvolved}*** | ***$${Math.round(record.avgPaidPr)}*** |\n `
            } else {
                return `| Week ${record.week}/${moment(record.date).format('YY')} | ${record.numberOfPaidPullRequests} | $${Math.round(record.amountPaid)} | ${record.numberOfPeopleInvolved} | $${Math.round(record.avgPaidPr)} |\n`
            }
        },
        burnRateHeaderMd: `<div align="center">  \n \n | date | # of <br /> paid <br /> PRs | total :moneybag: | # of <br /> :construction_worker: | :moneybag: / PR |
|:-----------------:|:-----------------------:|:----------------------:|:----------------:|:------------:| \n`,
        burnRateFooterMd: (totalPaidPullRequests, totalPeopleInvolved) => {
            return `\n \n **BURN RATE TABLE GENERATED BASED ON ${totalPaidPullRequests} PAID PULL REQUESTS AND CONTRIBUTIONS OF ${totalPeopleInvolved} PEOPLE** \n \n </div>`
        },
        getTotalPaidPullRequests: (burnRate) => {
            let totalPaidPullRequests = 0
            for (let i = 0; i < burnRate.length; i++) {
                if (burnRate[i].week !== undefined) {
                    totalPaidPullRequests += burnRate[i].numberOfPaidPullRequests
                }
            }
            return totalPaidPullRequests
        },
        getTotalPeopleInvolved: (burnRate) => {
            let totalPeopleInvolvedCount = 0
            let totalPeopleInvolved = []
            for (let i = 0; i < burnRate.length; i++) {
                for (let j = 0; j < burnRate[i].peopleInvolved.length; j++) {
                    if (!totalPeopleInvolved.includes(burnRate[i].peopleInvolved[j])) {
                        totalPeopleInvolved.push(burnRate[i].peopleInvolved[j])
                        totalPeopleInvolvedCount += 1
                    }
                }
            }
            return totalPeopleInvolvedCount
        },
    },
};
