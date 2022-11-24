const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("./shared");
const payout = require("./payout");
const assign = require("./assign");

module.exports = {
    assignIssueClosed: async (context) => {
        const issueNumber = context.params.issue.number;
        let storedIssue = await shared.getDataAc(issueNumber);
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (shared.checks.isIssueIgnored(storedIssue)) {
                await shared.deleteStoredDataAc(issueNumber);
                return;
            }
            storedIssue = await assign.handleOtherWebhook(issueNumber)
            let devObject = await shared.getDevObject(storedIssue.assignee)
            if (shared.checks.devObjectExists(devObject)) {
                await shared.updateDevObject(devObject, storedIssue.assignee, issueNumber, false)
            }
        }
    }
}
