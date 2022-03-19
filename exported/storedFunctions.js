const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const storedVariables = require('./storedVariables.js');
const {Octokit} = require('@octokit/rest');
const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_KEY,
});

module.exports = {
    generalParams: (issue_number) => {
        return {
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            issue_number: issue_number,
        };
    },
    issueInfo: (assignee, lockedPeriod, prOpened) => ({
        assignee,
        lockedPeriod,
        prOpened,
    }),

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
    storeData: async (namespace, prObject, issueNumber) => {
        await lib.http.request['@1.1.6']({
            method: 'PUT',
            url: module.exports.makeReq(namespace, issueNumber),
            headers: {
                'X-Auth-Email': process.env.CLDFLR_EMAIL,
                'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
            },
            body: JSON.stringify(prObject),
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

    storeAssignComment: async (
        apiObject,
        storedIssue,
        issueNumber,
        commentCreator,
        now
    ) => {
        if (storedIssue.result !== null) {
            await module.exports.removeAssignee(apiObject, storedIssue.assignee);
        }
        // GET bountyTime
        let bountyLabel = await module.exports.getLabels(
            apiObject,
            storedVariables.bountyTimes
        );
        // if there isn't bounty label, default is zero
        if (bountyLabel < 0) {
            bountyLabel = 24;
        }
        let lockedPeriod = now
            // needs to be hours in development instead of 'seconds' - using seconds * 3 to debug
            .add(bountyLabel * 3, 'seconds');

        //STORE, ASSIGN and COMMENT
        await module.exports.storeData(
            process.env.CLDFLR_ISSUES_NAMESPACE,
            module.exports.issueInfo(commentCreator, lockedPeriod, ''),
            issueNumber
        );
        await module.exports.assignIssue(apiObject, commentCreator);
        await module.exports.createComment(
            apiObject,
            storedVariables.successAssign(commentCreator, bountyLabel, lockedPeriod)
        );
    },
};
