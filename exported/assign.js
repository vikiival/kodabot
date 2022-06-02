const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const moment = require('moment');
const {Octokit} = require('@octokit/rest');
const octokit = new Octokit({
    auth: process.env.GH_KEY,
});
const {graphql} = require('@octokit/graphql');
const shared = require("./shared");
const comments = require("./comments");

module.exports = {

    /**
     * @returns object for issue stored in Autocode's KV storage
     * @param assignee user assigned to issue
     * @param timeOfAssignment time when assignment is created
     * @param assignmentPeriod time when assignment expires
     * @param prOpened number of PR opened for this issue (default '')
     * @param optionHolder user currently having option to pick issue (queue)
     * @param optionPeriod time when option expires
     * @param owner
     * @param repo
     * @example
     * {
     *     assignee: assignee,
     *     timeOfAssignment: timeOfAssignment,
     *     assignmentPeriod: assignmentPeriod,
     *     prOpened: prOpened,
     *     optionHolder: optionHolder,
     *     optionPeriod: optionPeriod,
     *     queue: []
     * }
     */
    issueObject: (
        assignee,
        timeOfAssignment,
        assignmentPeriod,
        prOpened,
        optionHolder,
        optionPeriod,
        owner,
        repo,
    ) => ({
        assignee,
        timeOfAssignment,
        assignmentPeriod,
        prOpened,
        optionHolder,
        optionPeriod,
        owner,
        repo,
        queue: [],
        ignored: false
    }),

    /**
     * @desc Store issue, assign issue, comment about assignment on GH
     * @param storedIssue issue being stored in AC KV storage
     * @param devObject dev object being stored on CF KV storage
     * @param issueNumber number of concerned issue
     * @param commentCreator login of dev triggering the bot
     * @param labels pulled from issue
     * @param ghObject
     * @param settings
     * */
    storeAssignComment: async (
        storedIssue,
        devObject,
        issueNumber,
        commentCreator,
        labels,
        ghObject,
        settings
    ) => {
        let timeFromBountyLabel = await module.exports.getBountyTime(labels, settings);
        timeFromBountyLabel = timeFromBountyLabel * (await module.exports.isVerifiedContributor(commentCreator, ghObject) ? 1.5 : 1)

        const assignmentPeriod = moment()
            .add(timeFromBountyLabel, `${settings.timeSpan}`)
            .format(); // TESTING can be done by setting time to seconds
        if (storedIssue.result !== null) {
            storedIssue.assignee = commentCreator;
            storedIssue.timeOfAssignment = moment().format();
            storedIssue.assignmentPeriod = assignmentPeriod;
            storedIssue.prOpened = null;
        } else {
            storedIssue = module.exports.issueObject(
                commentCreator,
                moment().format(),
                assignmentPeriod,
                null,
                null,
                null,
                ghObject.owner,
                ghObject.repo
            );
        }
        if (shared.checks.devObjectExists(devObject)) {
            if (!devObject.assigned.includes(issueNumber)) {
                devObject.assigned.push(issueNumber);
            }
        } else {
            devObject = shared.devObject();
            devObject.assigned.push(issueNumber);
        }
        await shared.storeDataCf(settings.cfDevs, commentCreator, devObject);
        await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue);
        let currentAssignees = await module.exports.getAssignees(issueNumber, shared.queries.getAssignees, ghObject);
        if (!currentAssignees.includes(commentCreator)) {
            await module.exports.assignIssue(issueNumber, commentCreator, ghObject);
        }
        await shared.createComment(
            issueNumber,
            comments.successAssign(
                commentCreator,
                timeFromBountyLabel,
                assignmentPeriod,
                settings
            ),
            ghObject
        );
    },

    /**
     * @desc Assigns issue on GH
     * @param issueNumber issue to be assigned
     * @param assignee to be pushed into array of assignees on GH
     * @param ghObject
     */
    assignIssue: async (issueNumber, assignee, ghObject) => {
        await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/assignees',
            {
                owner: ghObject.owner,
                repo: ghObject.repo,
                issue_number: issueNumber,
                assignees: [assignee],
            }
        );
    },

    /**
     * @desc Remove assignee from array of assignees on GH
     * @param issueNumber issue on which unassignment is being done
     * @param storedIssue
     * @param assignee to be removed from array of assignees on GH
     * @param ghObject
     * @param settings
     */
    unassignIssue: async (issueNumber, storedIssue, assignee, ghObject, settings) => {
        await octokit.request(
            'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
            {
                owner: ghObject.owner,
                repo: ghObject.repo,
                issue_number: issueNumber,
                assignees: [assignee],
            }
        );
        if (storedIssue !== null) {
            storedIssue.assignee = null;
            storedIssue.timeOfAssignment = null;
            storedIssue.assignmentPeriod = null;
            await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue);
            return storedIssue;
        }
    },

    /**
     * @returns time allocated to issue based on label. If multiple labels present, returns one with the longest time.
     * If no bounty label present, returns 24
     * @param labels pulled from issue
     * @param settings
     */
    getBountyTime: async (labels, settings) => {
        let bountyTime = 0;
        let goodFirstIssue = 1;
        for (let i = 0; i < labels.length; i++) {
            if (
                labels[i] in settings.bountyTimes &&
                settings.bountyTimes[labels[i]] > bountyTime
            ) {
                bountyTime = settings.bountyTimes[labels[i]];
            }
            if (labels[i] === 'good first issue') {
                goodFirstIssue = 1.5;
            }
        }
        if (bountyTime === 0) {
            bountyTime = 24;
        }
        return bountyTime * goodFirstIssue;
    },

    /**
     * @desc Toggles option on stored issue, adjusts queue, stores new issue
     * @returns updated issue
     * @param storedIssue issue stored in AC KV storage
     * @param issueNumber number of concerned issue
     * */
    toggleOptionPeriod: async (storedIssue, issueNumber, settings) => {
        storedIssue.optionHolder = storedIssue.queue[0];
        storedIssue.optionPeriod = moment()
            .add(settings.optionHours, `${settings.timeSpan}`)
            .format(); // TESTING can be done by setting time to seconds
        storedIssue = module.exports.removeDevFromQueue(
            storedIssue,
            storedIssue.optionHolder
        );
        await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue);
        return storedIssue
    },

    /**
     * @returns adjusted issue object, where dev is removed from queue
     * @param storedIssue issue object
     * @param devLogin login of dev
     * */
        removeDevFromQueue: (storedIssue, devLogin) => {
        for (let i = 0; i < storedIssue.queue.length; i++) {
            if (storedIssue.queue[i] === devLogin) {
                storedIssue.queue.splice(i, 1);
            }
        }
        return storedIssue;
    },


    /**
     * @desc Handles other webhook running at the same time, returns updated data from AC KV storage
     * @param issueNumber number of concerned issue
     * @param settings
     * */
    handleOtherWebhook: async (issueNumber, settings) => {
        await new Promise((r) => setTimeout(r, 3000));
        return await shared.getDataCf(settings.cfIssues, issueNumber)
    },

    /**
     * @returns array of assignees of given issue
     * @param query - graphql query to get assignees
     * @param issueNumber - number of issue
     * @param ghObject
     */
    getAssignees: async (issueNumber, query, ghObject) => {
        const queryResult = await graphql(query,
            {
                name: ghObject.repo,
                owner: ghObject.owner,
                number: issueNumber,
                headers: {
                    authorization: `token ${process.env.GH_KEY}`,
                },
            }
        );
        return queryResult.repository.issue.assignees.nodes.map(
            (assignee) => assignee.login
        );
    },

    getCollaborators: async (query, ghObject) => {
        const queryResult = await graphql(query,
            {
                name: ghObject.repo,
                owner: ghObject.owner,
                headers: {
                    authorization: `token ${process.env.GH_KEY}`,
                },
            }
        );
        return queryResult.repository.collaborators.nodes.map(
            (dev) => dev.login
        );
    },
    makeIssueIgnored: async (issueNumber, commentCreator, storedIssue, devObject, ghObject, settings) => {
        if (storedIssue !== null) {
            if (storedIssue.assignee === commentCreator) {
                if (devObject.assigned.includes(issueNumber)) {
                    for (let i = 0; i < devObject.assigned.length; i++) {
                        if (devObject.assigned[i] === issueNumber) {
                            devObject.assigned.splice(i, 1);
                        }
                    }
                    await shared.storeDataCf(settings.cfDevs, commentCreator, devObject)
                }
            } else if (storedIssue.assignee !== null && storedIssue.assignee !== commentCreator) {
                let assigneeDevObject = await shared.getDevObject(storedIssue.assignee, settings);
                if (assigneeDevObject.assigned.includes(issueNumber)) {
                    for (let i = 0; i < assigneeDevObject.assigned.length; i++) {
                        if (assigneeDevObject.assigned[i] === issueNumber) {
                            assigneeDevObject.assigned.splice(i, 1);
                        }
                    }
                    await shared.storeDataCf(settings.cfDevs, storedIssue.assignee, assigneeDevObject)
                }
            }
            storedIssue.ignored = true;
            await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue);
        } else {
            storedIssue = module.exports.issueObject(null, null, null, null, null, null, ghObject.owner, ghObject.repo)
            storedIssue.ignored = true;
            await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue);
        }
    },
    isVerifiedContributor: async (author, ghObject) => {
        const queryResult = await graphql(shared.queries.isVerifiedContributor,
            {
                qstr: `repo:${ghObject.owner}/${ghObject.repo} type:pr is:merged author:${author}`,
                first: 11,
                headers: {
                    authorization: `token ${process.env.GH_KEY}`,
                },
            }
        );
        return queryResult.search.nodes.length === 11
    },

    getIssueLabels: async (issueNumber, ghObject) => {
        const queryResult = await graphql(shared.queries.getIssueLabels,
            {
                name: ghObject.repo,
                owner: ghObject.owner,
                number: issueNumber,
                headers: {
                    authorization: `token ${process.env.GH_KEY}`,
                }
            }
        );
        if (queryResult.repository.issue.labels.nodes.length > 0) {
            return queryResult.repository.issue.labels.nodes.map(e => e.name);
        } else {
            return [];
        }
    }
}
