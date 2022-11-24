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
     * @desc Remove assignee from array of assignees on GH
     * @param issueNumber issue on which unassignment is being done
     * @param storedIssue
     * @param assignee to be removed from array of assignees on GH
     * @param ghObject
     */
    unassignIssue: async (issueNumber, storedIssue, assignee, ghObject) => {
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
            await shared.storeDataAc(issueNumber, storedIssue);
            return storedIssue;
        }
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
    }
}
