const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const {Octokit} = require('@octokit/rest');
const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_KEY,
});
const moment = require('moment');
const settings = require("./settings");
module.exports = {

    /**
     * @returns modified Cloudflare URL for various CF calls
     * @param namespace for CF KV workers
     * @param key for CF KV workers
     */
    makeUrl: (namespace, key) =>
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLDFLR_ACC_ID}/storage/kv/namespaces/${namespace}/values/${key}`,

    /**
     * @returns array of keys for given namespace
     * @param namespace CF namespace ID stored in env. variables
     */
    getAllKeys: async (namespace) => {
        const keysArray = [];
        const keysObject = JSON.parse(
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
            keysArray.push(parseInt(keysObject[i].name));
        }
        return keysArray;
    },

    /**
     * @returns pullObject stored on CF
     * @param prNumber key for CF call
     * */
    getPullObject: async (prNumber) => {
        return JSON.parse(
            (
                await lib.http.request['@1.1.6']({
                    method: 'GET',
                    url: module.exports.makeUrl(process.env.CLDFLR_PULLS, prNumber),
                    headers: {
                        'X-Auth-Email': process.env.CLDFLR_EMAIL,
                        'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
                    },
                })
            ).body.toString()
        );
    },

    /**
     * @desc Stores prObject on CF
     * @param pullObject pull object being stored
     * @param prNumber key under which pull is stored
     * */
    storePullObject: async (pullObject, prNumber) => {
        await lib.http.request['@1.1.6']({
            method: 'PUT',
            url: module.exports.makeUrl(process.env.CLDFLR_PULLS, prNumber),
            headers: {
                'X-Auth-Email': process.env.CLDFLR_EMAIL,
                'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
            },
            body: JSON.stringify(pullObject),
        });
    },

    /**
     * @desc Stores devObject on CF KV storage
     * @param devObject object to store on CF
     * @param devLogin key to 'PUT' on CF
     * */
    storeDevObject: async (devObject, devLogin) => {
        await lib.http.request['@1.1.6']({
            method: 'PUT',
            url: module.exports.makeUrl(process.env.CLDFLR_DEVS, devLogin),
            headers: {
                'X-Auth-Email': process.env.CLDFLR_EMAIL,
                'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
            },
            body: JSON.stringify(devObject),
        });
    },

    /**
     * @returns devObject stored on CF
     * @param devLogin - key used to 'GET' devObject from CF
     * */
    getDevObject: async (devLogin) =>
        JSON.parse(
            (
                await lib.http.request['@1.1.6']({
                    method: 'GET',
                    url: module.exports.makeUrl(process.env.CLDFLR_DEVS, devLogin),
                    headers: {
                        'X-Auth-Email': process.env.CLDFLR_EMAIL,
                        'X-Auth-Key': process.env.CLDFLR_GLOBAL_API_KEY,
                    },
                })
            ).body.toString()
        ),


    /**
     * @desc Creates comment on GH
     * @param issueNumber number of commented issue
     * @param body contents of comment
     */
    createComment: async (issueNumber, body) => {
        await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
            {
                owner: process.env.GITHUB_OWNER,
                repo: process.env.GITHUB_REPO,
                issue_number: issueNumber,
                body,
            }
        );
    },

    /**
     * @returns array of all entries stored in AC KV storage
     */
    getAllDataAc: async () => await lib.utils.kv['@0.1.16'].entries(),

    /**
     * @desc Deletes stored data in AC KV storage
     */
    deleteStoredDataAc: async (key) => {
        await lib.utils.kv['@0.1.16'].clear({
            key: key.toString(),
        });
    },

    /**
     * @returns data stored in AC's KV storage
     * @param key key under which data is being stored
     */
    getDataAc: async (key) => {
        return await lib.utils.kv['@0.1.16'].get({
            key: key.toString(),
        });
    },

    /**
     * @desc storing data in AC's KV storage
     * @param key key under which we store data in AC's KV storage
     * @param value value which we store in AC's KV storage
     */
    storeDataAc: async (key, value) => {
        await lib.utils.kv['@0.1.16'].set({
            key: key.toString(),
            value: value,
        });
    },

    /**
     * @desc stores temporary issue object in case of later payments
     * */
    storeTempIssuesAc: async (storedIssue, issueNumber) => {
        storedIssue.queue = [];
        storedIssue.prOpened = null;
        storedIssue.optionPeriod = null;
        storedIssue.optionHolder = null;
        storedIssue.assignmentPeriod = null;
        await module.exports.storeDataAc(issueNumber, storedIssue);
    },

    /**
     * @returns devObject used to store information about developer on CF KV storage
     * @example
     * {
     *     assigned: [9999], //issues currently assigned to dev
     *     finished: [9998], //issues successfully completed by dev
     *     unfinished: [], //unsuccessful attempts by dev
     *     droppedQueue: [9997, 9994, 8918], //issues passed on by dev in queue or during option period
     *     finishedStreak: [], //tracks potential payout multiplier (triggered at 3 within 7 days)
     * }
     */
    devObject: () => ({
        assigned: [],
        finished: [],
        unfinished: [],
        droppedQueue: [],
        finishedStreak: [],
    }),

    /**
     * @desc Stores information about dev dropping out of queue or option period.
     * Information being stored in devObject on CF KV storage
     * @param devLogin concerned dev login
     * @param issueNumber concerned issue number
     * @param storedIssue issue stored on AC KV storage
     * */
    storeDevDropoutQueue: async (devLogin, issueNumber, storedIssue) => {
        let devObject = await module.exports.getDevObject(devLogin);
        if (!module.exports.checks.devObjectExists(devObject)) {
            devObject = module.exports.devObject();
        }
        if (!devObject.droppedQueue.includes(issueNumber)) {
            devObject.droppedQueue.push(issueNumber);
        }
        await module.exports.storeDevObject(devObject, devLogin);
        if (storedIssue.queue.includes(devLogin)) {
            for (let i = 0; i < storedIssue.queue.length; i++) {
                if (storedIssue.queue[i] === devLogin) {
                    storedIssue.queue.splice(i, 1);
                }
            }
        }
        if (storedIssue.optionHolder === devLogin) {
            storedIssue.optionHolder = null;
            storedIssue.optionPeriod = null;
        }
        await module.exports.storeDataAc(issueNumber, storedIssue);
        return storedIssue
    },

    /**
     * @desc Updates info about dev on CF KV storage. Used during assignment changes
     * @param devObject dev object stored on CF
     * @param devLogin concerned dev login
     * @param issueNumber concerned issue number
     * @param prMerged boolean used to determine if PR was merged
     * */
    updateDevObject: async (devObject, devLogin, issueNumber, prMerged) => {
        if (devObject.assigned.includes(issueNumber)) {
            for (let i = 0; i < devObject.assigned.length; i++) {
                if (devObject.assigned[i] === issueNumber) {
                    devObject.assigned.splice(i, 1);
                }
            }
        }
        if (!prMerged) {
            devObject.unfinished.push(issueNumber);
            devObject.unfinished = [... new Set(devObject.unfinished)]
        } else {
            devObject.finished.push(issueNumber);
            devObject.finished = [... new Set(devObject.finished)]
        }
        await module.exports.storeDevObject(devObject, devLogin);
    },

    checks: {

        /**
         * @returns true if dev assignment limit (5 issues) was reached
         */
        devAssignmentLimit: (devObject) => {
            return devObject.assigned.length >= 5;
        },

        /**
         * @returns true if dev has record of unsuccessful attempt
         */
        devUnfinished: (devObject, issueNumber) => {
            return devObject.unfinished.includes(issueNumber);
        },

        /**
         * @returns true if PR was opened for this issue
         */
        prOpened: (storedIssue) => {
            return storedIssue.prOpened !== null;
        },

        /**
         * @returns true if assignment already expired
         */
        assignmentExpired: (storedIssue) => {
            return (
                moment() > moment(storedIssue.assignmentPeriod) &&
                storedIssue.assignmentPeriod !== null
            );
        },

        /**
         * @returns true if option is still valid for comment creator.
         */
        optionAvailability: (storedIssue, commentCreator) => {
            return (
                storedIssue.assignee === null &&
                storedIssue.optionHolder === commentCreator &&
                moment(storedIssue.optionPeriod) > moment()
            );
        },

        /**
         * @returns true if option period expired
         */
        optionExpired: (storedIssue) => {
            return (
                moment(storedIssue.optionPeriod) < moment() &&
                storedIssue.optionPeriod !== null
            );
        },

        /**
         * @returns true if comment triggered by payout
         */
        payoutPhrases: (commentBody) => {
            return commentBody.includes(settings.payoutPhrase);
        },

        /**
         * @returns true if tested user is on list of ignored users
         */
        ignoredUsers: (testedUser) => {
            return settings.ignoredUsers.includes(testedUser);
        },

        /**
         * @returns true if comment content is on list of "pass phrases" for options and queue
         */
        passPhrases: (commentBody) => {
            return settings.passPhrases.includes(commentBody);
        },

        /**
         * @returns true if assign bot was triggered
         */
        goPhrases: (commentBody) => {
            return settings.goPhrases.includes(commentBody);
        },

        /**
         * @returns true if queue isn't empty
         */
        queuedDevs: (storedIssue) => {
            return storedIssue.queue.length > 0;
        },

        /**
         * @returns true if queue contains dev
         */
        queueForDev: (devLogin, storedIssue) => {
            return storedIssue.queue.includes(devLogin);
        },

        /**
         * @returns true if next in queue is the same one as option holder
         */
        nextInQueueOptionHolder: (storedIssue) => {
            return storedIssue.queue[0] === storedIssue.optionHolder;
        },

        /**
         * @returns true if next in queue is comment creator
         */
        nextInQueueCommentCreator: (storedIssue, commentCreator) => {
            return storedIssue.queue[0] === commentCreator;
        },

        /**
         * @returns true if stored issue exists
         */
        storedIssueExists: (storedIssue) => {
            return storedIssue !== null;
        },

        /**
         * @returns true if stored issue is only in temp storage (securing late finishedStreaks)
         */
        storedIssueTemp: (storedIssue) => {
            return (
                storedIssue.assignee !== null && storedIssue.timeOfAssignment !== null &&
                storedIssue.prOpened === null &&
                storedIssue.optionHolder === null &&
                storedIssue.optionPeriod === null &&
                storedIssue.assignmentPeriod === null &&
                storedIssue.queue.length === 0
            );
        },

        /**
         * @returns true if dev info exists
         */
        devObjectExists: (devObject) => {
            return devObject.result !== null;
        },

        /**
         * @returns true if stored pull request is empty
         */
        emptyPull: (storedPull) => {
            return storedPull.result === null;
        },

        /**
         * @returns true if it's safe to delete the issue from temp storage on AC KV storage
         */
        emptyIssue: (storedIssue) => {
            return storedIssue.assignee === null &&
                storedIssue.timeOfAssignment === null &&
                storedIssue.assignmentPeriod === null &&
                storedIssue.optionHolder === null &&
                storedIssue.optionPeriod === null &&
                storedIssue.prOpened === null &&
                storedIssue.queue.length === 0
        },

        /**
         * @returns true if temporary storage of PRs has reached limit for LEADERBOARD.MD update
         */
        mergedAndPaidFull: (mergedAndPaid) => {
            if (mergedAndPaid === null) {
                return false
            }
            return mergedAndPaid.length >= settings.mergedAndPaidLimit;
        },

        /**
         * @returns true if dev already dropped out of queue or passed on option
         */
        devQueueDropout: (devObject, issueNumber) => {
            return devObject.droppedQueue.includes(issueNumber);
        },

        /**
         * @returns true if current storedIssue assignee matches comment creator
         */
        assigneeIsCommentCreator: (storedIssue, commentCreator) => {
            return storedIssue.assignee === commentCreator;
        },

        /**
         * @returns true if prAuthor matches storedIssue assignee
         */
        prAuthorIsAssigned: (storedIssue, prAuthor) => {
            if (storedIssue === null) {
                return false
            }
            return storedIssue.assignee === prAuthor;
        },

        /**
         * @returns true if there was a linked issue in PR body
         */
        linkedIssueNumber: (issueNumber) => {
            if (issueNumber === undefined){
                return false
            }
            return issueNumber !== 0;
        },

        /**
         * @returns true if transaction is empty
         */
        transactionEmpty: (transaction) => {
            return transaction === null;
        },

        /**
         * @returns true if pull object is already in leaderboard
         */
        addedToLeaderboard: (pullObject) => {
            if (pullObject === null) {
                return false
            }
            return pullObject.prLeaderboard
        },

        /**
         * @returns true if record is missing from leaderboard
         * */
        missingFromLeaderboard: (leaderboardRecord) => {
            return leaderboardRecord === undefined
        },

        /**
         * @returns true if mergedDate from PR is more recent than mergeDate store in leaderboard record
         * */
        newMergeDate: (storedLeaderboardRecord, storedPull) => {
            if (storedPull.prMergedDate === null || storedLeaderboardRecord.lastMergedPrDate === null) {
                return false
            }
            return moment(storedLeaderboardRecord.lastMergedPrDate) <
                moment(storedPull.prMergedDate)
        },

        /**
         * @returns true if PR was merged
         * */
        prMerged: (pullRequest) => {
            return pullRequest.prState === 'MERGED'
        },

        /**
         * @returns true if PR is recorded in current FinishedStreak
         * */
        isInFinishedStreak: (devObject, prNumber) => {
            for (let i = 0; i < devObject.finishedStreak.length; i++) {
                if (devObject.finishedStreak[i].prNumber === prNumber) {
                    return true
                }
            }
            return false
        }
    }
}
