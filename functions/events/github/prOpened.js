const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const functions = require('../../../exported/functions.js');
const variables = require('../../../exported/variables.js');

const prBody = context.params.event.pull_request.body;
const prNumber = context.params.event.pull_request.number;
const prAuthor = context.params.event.pull_request.user.login;

if (variables.ignoredUsers.includes(prAuthor)){
    return
}
let issueNumber = variables.prClosingIssue(prBody).toString().trim();
let generalObject = functions.generalParams(prNumber);

// try to pull Issue Object about this PRs closing issue
let storedIssue = await functions.getStoredDataAC(
    issueNumber
);

// IF assignee matches PR author
if (storedIssue.assignee === prAuthor) {
    storedIssue.prOpened = prNumber;
    // store information about linked PR
    await functions.storeIssueAC(
        issueNumber,
        storedIssue
    );
    // successComment on PR
    await functions.createComment(
        generalObject,
        variables.successPr(prAuthor, issueNumber)
    );
// IF assignee doesn't match PR author
} else {
    // warningComment on PR
    await functions.createComment(
        generalObject,
        variables.warningPr(prAuthor, issueNumber)
    );
}
