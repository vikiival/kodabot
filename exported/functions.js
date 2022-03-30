const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const variables = require('./variables.js');
const {Octokit} = require('@octokit/rest');
const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_KEY,
});
const btoa = require('btoa')
const moment = require('moment')

module.exports = {
    generalParams: (issue_number) => {
        return {
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            issue_number: issue_number,
        };
    },
    issueInfo: (assignee, lockedPeriod, prOpened, optionHolder, optionPeriod) => {
        return {
            assignee: assignee,
            lockedPeriod: lockedPeriod,
            optionHolder: optionHolder,
            optionPeriod: optionPeriod,
            prOpened: prOpened,
            queue: [],
        };
    },
    getSHALeaderboard: async () => {
        return (await lib.http.request['@1.1.6'].get({
            url: `https://api.github.com/repos/petersopko/kodabot-test/contents/LEADERBOARD.MD`,
            headers: {
                'User-Agent': `'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1521.3 Safari/537.36'`
            }
        })).data.sha
    },
    updateLeaderboardGH: async (apiObject, updatedTable, now, sha) => {
        await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: apiObject.owner,
            repo: apiObject.repo,
            path: 'LEADERBOARD.MD',
            message: `updateLeaderboard${now}`,
            content: btoa(updatedTable),
            sha: sha
        })
    },

    createComment: async (apiObject, body) => {
        await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
            {
                owner: apiObject.owner,
                repo: apiObject.repo,
                issue_number: apiObject.issue_number,
                body: body,
            }
        );
    },
    assignIssue: async (apiObject, assignees) => {
        await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/assignees',
            {
                owner: apiObject.owner,
                repo: apiObject.repo,
                issue_number: apiObject.issue_number,
                assignees: [assignees],
            }
        );
    },
    removeAssignee: async (apiObject, assignee) => {
        await octokit.request(
            'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
            {
                owner: apiObject.owner,
                repo: apiObject.repo,
                issue_number: apiObject.issue_number,
                assignees: [assignee],
            }
        );
    },
    getPull: async (apiObject) => {
        const pullData = await octokit.request(
            'GET /repos/{owner}/{repo}/pulls/{pull_number}',
            {
                owner: apiObject.owner,
                repo: apiObject.repo,
                pull_number: apiObject.issue_number,
            }
        );
        return pullData.data;
    },
    getLabels: async (apiObject, bountyTimes) => {
        let labelsRaw = await octokit.request(
            'GET /repos/{owner}/{repo}/issues/{issue_number}/labels',
            {
                owner: apiObject.owner,
                repo: apiObject.repo,
                issue_number: apiObject.issue_number,
            }
        );
        labelsRaw = labelsRaw.data;
        let bountyTime = 0;
        labelsRaw.forEach((label) => {
            if (label.name in bountyTimes) {
                bountyTime = bountyTimes[label.name];
            }
        });
        return bountyTime;
    },

    makeReq: (namespace, key) => {
        return `https://api.cloudflare.com/client/v4/accounts/${process.env.CLDFLR_ACC_ID}/storage/kv/namespaces/${namespace}/values/${key}`;
    },
    makePullObject: (pullData, commentBody) => {
        let extrinsicBody = commentBody.split(
            'https://kusama.subscan.io/extrinsic/'
        )[1];
        let extrinsicHash = extrinsicBody.substring(0, extrinsicBody.indexOf(')'));
        return {
            prLeaderboard: false,
            prNumber: pullData.number,
            prAuthor: pullData.user.login,
            prState: pullData.state,
            githubLink: pullData.html_url,
            transactions: [
                {
                    transactionResult: null, //subscan API when generating table
                    paidUsd: parseFloat(
                        commentBody
                            .substring(
                                commentBody.indexOf('$') + 1,
                                commentBody.lastIndexOf('@')
                            )
                            .trim()
                    ),
                    paidKsm: parseFloat(
                        commentBody
                            .substring(
                                commentBody.indexOf('~') + 1,
                                commentBody.lastIndexOf('$')
                            )
                            .trim()
                    ),
                    subscanLink: `https://kusama.subscan.io/extrinsic/${extrinsicHash}`,
                    //comment body
                    subscanHash: extrinsicHash,
                    //comment body
                },
            ],
            prMergedDate: pullData.merged_at, /// CLOSED PR
            commits: pullData.commits, // CLOSED PR
            linesAdded: pullData.additions, // CLOSED PR
            linesRemoved: pullData.deletions, // CLOSED PR
        };
    },
    storeData: async (namespace, storedObject, issueNumber) => {
        await lib.http.request['@1.1.6']({
            method: 'PUT',
            url: module.exports.makeReq(namespace, issueNumber),
            headers: {
                'X-Auth-Email': process.env.CLDFLR_EMAIL,
                'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
            },
            body: JSON.stringify(storedObject),
        });
    },
    getStoredData: async (namespace, issueNumber) => {
        return JSON.parse(
            (
                await lib.http.request['@1.1.6']({
                    method: 'GET',
                    url: module.exports.makeReq(namespace, issueNumber),
                    headers: {
                        'X-Auth-Email': process.env.CLDFLR_EMAIL,
                        'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
                    },
                })
            ).body.toString()
        );
    },
    cfStoreLeaderboard: async (data, key) => {
        await lib.http.request['@1.1.6']({
            method: 'PUT',
            url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLDFLR_ACC_ID}/storage/kv/namespaces/${process.env.CLDFLR_PULLS}/values/${key}`,
            headers: {
                'X-Auth-Email': process.env.CLDFLR_EMAIL,
                'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
            },
            body: JSON.stringify(data),
        })
    },
    storeIssueAC: async (issueNumber, storedIssue) => {
        if (storedIssue.lockedPeriod !== '') {
            storedIssue.lockedPeriod = storedIssue.lockedPeriod.toString()
        }
        if (storedIssue.optionPeriod !== '') {
            storedIssue.optionPeriod = storedIssue.optionPeriod.toString()
        }
        await lib.utils.kv['@0.1.16'].set({
            key: issueNumber.toString(),
            value: storedIssue
        })
    },
    storeTempPullsAC: async (pullsArray) => {
        await lib.utils.kv['@0.1.16'].set({
            key: 'tempPulls',
            value: pullsArray
        })
    },
    getTempPullsAC: async () => {
        return await lib.utils.kv['@0.1.16'].get({
            key: 'tempPulls'
        })
    },
    getUnpaidPullsAC: async () => {
        return await lib.utils.kv['@0.1.16'].get({
            key: 'unpaidPulls'
        })
    },
    storeUnpaidPullsAC: async (pullsArray) => {
        await lib.utils.kv['@0.1.16'].set({
            key: 'unpaidPulls',
            value: pullsArray
        })
    },

    getStoredDataAC: async (issueNumber) => {
        let storedIssue = await lib.utils.kv['@0.1.16'].get({
            key: issueNumber.toString()
        })
        if (storedIssue !== null) {
            if (storedIssue.lockedPeriod !== '') {
                storedIssue.lockedPeriod = moment(storedIssue.lockedPeriod)
            }
            if (storedIssue.optionPeriod !== '') {
                storedIssue.optionPeriod = moment(storedIssue.optionPeriod)
            }
        }
        return storedIssue
    },
    getALlDataAC: async () => {
        return await lib.utils.kv['@0.1.16'].entries()
    },
    deleteStoredDataAC: async (issueNumber) => {
        await lib.utils.kv['@0.1.16'].clear({
            key: issueNumber.toString()
        });
    },
    deleteStoredData: async (namespace, issueNumber) => {
        await lib.http.request['@1.1.6']({
            method: 'DELETE',
            url: module.exports.makeReq(namespace, issueNumber),
            headers: {
                'X-Auth-Email': process.env.CLDFLR_EMAIL,
                'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
            },
        });
    },

    storeDevInfo: async (namespace, devInfo, devName) => {
        await lib.http.request['@1.1.6']({
            method: 'PUT',
            url: module.exports.makeReq(namespace, devName),
            headers: {
                'X-Auth-Email': process.env.CLDFLR_EMAIL,
                'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
            },
            body: JSON.stringify(devInfo),
        });
    },

    getDevInfo: async (namespace, devName) => {
        return JSON.parse(
            (
                await lib.http.request['@1.1.6']({
                    method: 'GET',
                    url: module.exports.makeReq(namespace, devName),
                    headers: {
                        'X-Auth-Email': process.env.CLDFLR_EMAIL,
                        'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
                    },
                })
            ).body.toString()
        );
    },

    getAllKeys: async (namespace) => {
        let keysArray = []
        let keysObject = JSON.parse(
            (
                await lib.http.request['@1.1.6']({
                    method: 'GET',
                    url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLDFLR_ACC_ID}/storage/kv/namespaces/${namespace}/keys`,
                    headers: {
                        'X-Auth-Email': process.env.CLDFLR_EMAIL,
                        'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
                    },
                })
            ).body.toString()
        ).result;
        for (let i = 0; i < keysObject.length; i++) {
            keysArray.push(parseInt(keysObject[i].name))
        }
        return keysArray
    },

    createOptionPeriod: (now) => {
        return now.add(30, 'seconds')
    },
    toggleOption: async (storedIssue, generalObject, now, issueNumber) => {
        // if there's another dev queued up,
        storedIssue.optionHolder = storedIssue.queue[0]
        storedIssue.optionPeriod = module.exports.createOptionPeriod(now)
        for (let i = 0; i < storedIssue.queue.length; i++) {
            if (storedIssue.queue[i] === storedIssue.optionHolder) {
                storedIssue.queue.splice(i, 1);
            }
        }
        storedIssue = module.exports.removeOptionHolderFromQueue(storedIssue)
        await module.exports.storeIssueAC(issueNumber, storedIssue);
    },
    removeOptionHolderFromQueue: (storedIssue) => {
        for (let i = 0; i < storedIssue.queue.length; i++) {
            if (storedIssue.queue[i] === storedIssue.optionHolder) {
                storedIssue.queue.splice(i, 1);
            }
        }
        return storedIssue
    },


    handleOtherWebhook: async (issueNumber) => {
        await new Promise(r => setTimeout(r, 3000));
        return await module.exports.getStoredDataAC(
            process.env.CLDFLR_ISSUES,
            issueNumber
        )
    },
    devInfoUpdate: async (devInfo, devLogin, issueNumber, prMerged) => {
        if (devInfo.assigned.includes(issueNumber)) {
            for (let i = 0; i < devInfo.assigned.length; i++) {
                if (devInfo.assigned[i] === issueNumber) {
                    devInfo.assigned.splice(i, 1);
                }
            }
        }
        if (!prMerged) {
            devInfo.unfinished.push(issueNumber);
        } else {
            devInfo.finished.push(issueNumber)
        }
        await module.exports.storeDevInfo(
            process.env.CLDFLR_DEVS,
            devInfo,
            devLogin
        )
    },
    storeLeaderboard: async (namespace, tableName, leaderboard) => {
        await lib.http.request['@1.1.6']({
            method: 'PUT',
            url: module.exports.makeReq(namespace, tableName),
            headers: {
                'X-Auth-Email': process.env.CLDFLR_EMAIL,
                'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
            },
            body: JSON.stringify(leaderboard),
        });
    },
    getLeaderboard: async () => {
        return JSON.parse(
            (
                await lib.http.request['@1.1.6']({
                    method: 'GET',
                    url: module.exports.makeReq(process.env.CLDFLR_TABLES, 'leaderboard'),
                    headers: {
                        'X-Auth-Email': process.env.CLDFLR_EMAIL,
                        'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
                    },
                })
            ).body.toString()
        );
    },
    generateMdTable: (leaderboard) => {
        let mdTable = variables.tableHeader
        for (let i = 0; i < leaderboard.length; i++) {
            let oneRecord = leaderboard[i];
            mdTable += module.exports.generateMdRecord(oneRecord.devLogin, oneRecord)
        }
        return mdTable
    },
    updateLeaderboard: async (tempPulls, leaderboard) => {
        for (let i = 0; i < tempPulls.length; i++) {
            let onePull = tempPulls[i];
            let storedPull = await module.exports.getStoredData(
                process.env.CLDFLR_PULLS,
                onePull
            );
            // console.log(storedPull)
            let leaderboardRecord = leaderboard.find(obj => {
                return obj.devLogin === storedPull.prAuthor
            })
            if (leaderboardRecord === undefined) {
                leaderboard.push(module.exports.generateLeaderboardRecord(storedPull))
            } else {
                module.exports.updateLeaderboardRecord(storedPull, leaderboardRecord)
            }
        }
        leaderboard.sort((a, b) => b.totalAmountReceivedUSD - a.totalAmountReceivedUSD)
        await module.exports.storeLeaderboard(process.env.CLDFLR_TABLES, 'leaderboard', leaderboard)
        console.log(leaderboard)
        return leaderboard
    },
    generateLeaderboardRecord: (storedPull) => {
        let dollarValue = 0
        let kusamaValue = 0
        let mergedPrs = 0
        let numberOfOpenPrs = 1
        let closedPrs = 0
        let linkToLastSubscan = ''
        for (let i = 0; i < storedPull.transactions.length; i++) {
            let oneTransaction = storedPull.transactions[i];
            // NULL NEEDS TO BE HANDLED WITH SUBSCAN API
            if (oneTransaction.transactionResult === 'Success' || oneTransaction.transactionResult === 'accounting' || oneTransaction.transactionResult === 'null') {
                dollarValue += oneTransaction.paidUsd
                kusamaValue += oneTransaction.paidKsm
                if (linkToLastSubscan === '') {
                    linkToLastSubscan = oneTransaction.subscanLink
                }
            }
        }
        if (storedPull.prState === 'closed') {
            closedPrs += 1
        } else {
            mergedPrs += 1
        }
        return {
            devLogin: storedPull.prAuthor,
            totalAmountReceivedUSD: dollarValue,
            totalAmountReceivedKSM: kusamaValue,
            numberOfOpenPrs: numberOfOpenPrs,
            mergedPrs: mergedPrs,
            closedPrs: closedPrs,
            linesAdded: storedPull.linesAdded,
            linesRemoved: storedPull.linesRemoved,
            numOfTotalCommitsMerged: storedPull.commits,
            linkToLastSubscan: linkToLastSubscan,
            lastMergedPrDate: storedPull.prMergedDate
        }
    },
    updateLeaderboardRecord: (storedPull, storedLeaderboardRecord) => {
        storedLeaderboardRecord.numberOfOpenPrs += 1
        storedLeaderboardRecord.linesAdded += storedPull.linesAdded
        storedLeaderboardRecord.linesRemoved += storedPull.linesRemoved
        storedLeaderboardRecord.numOfTotalCommitsMerged += storedPull.commits

        for (let i = 0; i < storedPull.transactions.length; i++) {
            let oneTransaction = storedPull.transactions[i];
            // NULL NEEDS TO BE HANDLED WITH SUBSCAN API
            if (oneTransaction.transactionResult === 'Success' || oneTransaction.transactionResult === 'accounting' || oneTransaction.transactionResult === 'null') {
                storedLeaderboardRecord.totalAmountReceivedUSD += oneTransaction.paidUsd
                storedLeaderboardRecord.totalAmountReceivedKSM += oneTransaction.paidKsm
                if (moment(storedLeaderboardRecord.lastMergedPrDate) < moment(storedPull.prMergedDate)) {
                    storedLeaderboardRecord.lastMergedPrDate = storedPull.prMergedDate
                    storedLeaderboardRecord.linkToLastSubscan = oneTransaction.subscanLink
                }
            }
        }
        if (storedPull.prState === 'closed') {
            storedLeaderboardRecord.closedPrs += 1
        } else {
            storedLeaderboardRecord.mergedPrs += 1
        }
        return storedLeaderboardRecord
    },
    generateMdRecord: (devLogin, leaderboardRecord) => {
        return `| ${devLogin}  | $${Math.round((leaderboardRecord.totalAmountReceivedUSD + Number.EPSILON) * 100) / 100}/${Math.round((leaderboardRecord.totalAmountReceivedKSM + Number.EPSILON) * 100) / 100}KSM | $${leaderboardRecord.totalAmountReceivedUSD}/${leaderboardRecord.mergedPrs}       | ${leaderboardRecord.numberOfOpenPrs}              | ${leaderboardRecord.mergedPrs}         | ${leaderboardRecord.closedPrs}          | ${leaderboardRecord.linesAdded}/${leaderboardRecord.linesRemoved}                  | ${leaderboardRecord.numOfTotalCommitsMerged}                  | [Link to last transaction](${leaderboardRecord.linkToLastSubscan}) |
`
    },
    storeAssignComment: async (
        apiObject,
        storedIssue,
        devInfo,
        issueNumber,
        commentCreator,
        now
    ) => {
        // GET bountyTime
        let bountyLabel = await module.exports.getLabels(
            apiObject,
            variables.bountyTimes
        );
        // if there isn't bounty label, default is zero
        if (bountyLabel < 0) {
            bountyLabel = 24;
        }
        let lockedPeriod = now
            // needs to be hours in development instead of 'seconds' - using seconds * 3 to debug
            .add(bountyLabel, 'seconds');

        //STORE, ASSIGN and COMMENT
        if (storedIssue !== null) {
            storedIssue.assignee = commentCreator;
            storedIssue.lockedPeriod = lockedPeriod;
            storedIssue.prOpened = '';
        } else {
            storedIssue = module.exports.issueInfo(commentCreator, lockedPeriod, '', '', '');
        }
        if (devInfo.result !== null) {
            if (!(devInfo.assigned.includes(issueNumber))) {
                devInfo.assigned.push(issueNumber);
            }
        } else {
            devInfo = {
                assigned: [issueNumber],
                finished: [],
                unfinished: [],
            };
        }
        await module.exports.storeDevInfo(
            process.env.CLDFLR_DEVS,
            devInfo,
            commentCreator
        );
        await module.exports.assignIssue(apiObject, commentCreator);
        await module.exports.createComment(
            apiObject,
            variables.successAssign(commentCreator, bountyLabel, lockedPeriod)
        );
        await module.exports.storeIssueAC(
            issueNumber,
            storedIssue
        );
    },
};
