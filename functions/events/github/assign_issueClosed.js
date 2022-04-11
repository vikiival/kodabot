const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("../../../exported/shared");

const issueNumber = context.params.event.issue.number;
let storedIssue = await shared.getDataAc(issueNumber);
if (shared.checks.storedIssueExists(storedIssue)) {
    await shared.storeTempIssuesAc(storedIssue, issueNumber);
}
