const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("./shared");
const payout = require("./payout");
const assign = require("./assign");

module.exports = {
    assignIssueClosed: async (payload) => {
        const issueNumber = payload.issue.number;
        let storedIssue = await shared.getDataCf(process.env.CLDFLR_ISSUES, issueNumber);
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (shared.checks.isIssueIgnored(storedIssue)) {
                await shared.deleteDataCf(process.env.CLDFLR_ISSUES, issueNumber);
                return;
            }
            storedIssue = await assign.handleOtherWebhook(issueNumber)
            let devObject = await shared.getDevObject(storedIssue.assignee)
            if (shared.checks.devObjectExists(devObject)) {
                await shared.updateDevObject(devObject, storedIssue.assignee, issueNumber, false)
            }
            await shared.storeTempIssuesAc(storedIssue, issueNumber);
        }
    }
}
