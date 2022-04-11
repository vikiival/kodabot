const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("../../../exported/shared");
const payout = require("../../../exported/payout");
const settings = require("../../../exported/settings");

const prNumber = context.params.event.pull_request.number;
const prAuthor = context.params.event.pull_request.user.login;

const issueNumber = payout.getLinkedIssue(await payout.getPullRequest(prNumber));
let storedIssue = await shared.getDataAc(issueNumber);

if (shared.checks.ignoredUsers(prAuthor)) {
    return
}
if (shared.checks.linkedIssueNumber(issueNumber)) {
    if (shared.checks.prAuthorIsAssigned(storedIssue, prAuthor)) {
        storedIssue.prOpened = prNumber;
        await shared.storeDataAc(issueNumber, storedIssue);
        await shared.createComment(prNumber, settings.comments.successPr(prAuthor, issueNumber));
    } else {
        await shared.createComment(prNumber, settings.comments.warningPr(prAuthor, issueNumber));
    }
}
