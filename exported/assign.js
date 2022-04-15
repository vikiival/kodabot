const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const moment = require('moment');
const {Octokit} = require('@octokit/rest');
const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_KEY,
});

const settings = require("./settings");
const shared = require("./shared");

module.exports = {

    /**
     * @returns object for issue stored in Autocode's KV storage
     * @param assignee user assigned to issue
     * @param timeOfAssignment time when assignment is created
     * @param assignmentPeriod time when assignment expires
     * @param prOpened number of PR opened for this issue (default '')
     * @param optionHolder user currently having option to pick issue (queue)
     * @param optionPeriod time when option expires
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
        optionPeriod
    ) => ({
        assignee,
        timeOfAssignment,
        assignmentPeriod,
        prOpened,
        optionHolder,
        optionPeriod,
        queue: []
    }),

    /**
     * @desc Store issue, assign issue, comment about assignment on GH
     * @param storedIssue issue being stored in AC KV storage
     * @param devObject dev object being stored on CF KV storage
     * @param issueNumber number of concerned issue
     * @param commentCreator login of dev triggering the bot
     * */
    storeAssignComment: async (
        storedIssue,
        devObject,
        issueNumber,
        commentCreator
    ) => {
        let timeFromBountyLabel = await module.exports.getBountyTime(issueNumber);
        const assignmentPeriod = moment()
            .add(timeFromBountyLabel, `${settings.timeSpan}`)
            .format(); // TESTING can be done by setting time to seconds
        if (storedIssue !== null) {
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
                []
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
        await shared.storeDataCf(process.env.CLDFLR_DEVS, commentCreator, devObject);
        await shared.storeDataAc(issueNumber, storedIssue);
        await module.exports.assignIssue(issueNumber, commentCreator);
        await shared.createComment(
            issueNumber,
            settings.comments.successAssign(
                commentCreator,
                timeFromBountyLabel,
                assignmentPeriod
            )
        );
    },

    /**
     * @desc Assigns issue on GH
     * @param issueNumber issue to be assigned
     * @param assignee to be pushed into array of assignees on GH
     */
    assignIssue: async (issueNumber, assignee) => {
        await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/assignees',
            {
                owner: process.env.GITHUB_OWNER,
                repo: process.env.GITHUB_REPO,
                issue_number: issueNumber,
                assignees: [assignee],
            }
        );
    },

    /**
     * @desc Remove assignee from array of assignees on GH
     * @param issueNumber issue on which unassignment is being done
     * @param assignee to be removed from array of assignees on GH
     */
    unassignIssue: async (issueNumber, assignee) => {
        await octokit.request(
            'DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees',
            {
                owner: process.env.GITHUB_OWNER,
                repo: process.env.GITHUB_REPO,
                issue_number: issueNumber,
                assignees: [assignee],
            }
        );
    },

    /**
     * @returns time allocated to issue based on label. If multiple labels present, returns one with the longest time.
     * If no bounty label present, returns 0
     * @param issueNumber object used to make GH api calls
     */
    getBountyTime: async (issueNumber) => {
        let labelsRaw = await octokit.request(
            'GET /repos/{owner}/{repo}/issues/{issue_number}/labels',
            {
                owner: process.env.GITHUB_OWNER,
                repo: process.env.GITHUB_REPO,
                issue_number: issueNumber,
            }
        );
        labelsRaw = labelsRaw.data;
        let bountyTime = 0;
        labelsRaw.forEach((label) => {
            if (
                label.name in settings.bountyTimes &&
                settings.bountyTimes[label.name] > bountyTime
            ) {
                bountyTime = settings.bountyTimes[label.name];
            }
        });
        if (bountyTime === 0) {
            bountyTime = 24;
        }
        return bountyTime;
    },

    /**
     * @desc Toggles option on stored issue, adjusts queue, stores new issue
     * @returns updated issue
     * @param storedIssue issue stored in AC KV storage
     * @param issueNumber number of concerned issue
     * */
    toggleOptionPeriod: async (storedIssue, issueNumber) => {
        storedIssue.optionHolder = storedIssue.queue[0];
        storedIssue.optionPeriod = moment()
            .add(settings.optionHours, `${settings.timeSpan}`)
            .format(); // TESTING can be done by setting time to seconds
        storedIssue = module.exports.removeDevFromQueue(
            storedIssue,
            storedIssue.optionHolder
        );
        await shared.storeDataAc(issueNumber, storedIssue);
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
     * */
    handleOtherWebhook: async (issueNumber) => {
        await new Promise((r) => setTimeout(r, 3000));
        return await shared.getDataAc(issueNumber);
    }
}
