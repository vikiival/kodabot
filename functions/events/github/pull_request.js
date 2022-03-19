const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const storedFunctions = require('../../../exported/storedFunctions.js');
const storedVariables = require('../../../exported/storedVariables.js');

const prBody = context.params.event.pull_request.body;
const prNumber = context.params.event.pull_request.number;
const prAuthor = context.params.event.pull_request.user.login;

let closingIssue = storedVariables.prClosingIssue(prBody).toString().trim();
let generalObject = storedFunctions.generalParams(prNumber);

// try to pull Issue Object about this PRs closing issue
let storedIssue = await storedFunctions.getStoredData(
    process.env.CLDFLR_ISSUES_NAMESPACE,
    closingIssue
);

// IF assignee matches PR author
if (storedIssue.assignee === prAuthor) {
    storedIssue.prOpened = prNumber;
    // store information about linked PR
    await storedFunctions.storeData(
        process.env.CLDFLR_ISSUES_NAMESPACE,
        storedIssue,
        closingIssue
    );
    // successComment on PR
    await storedFunctions.createComment(
        generalObject,
        storedVariables.successPr(prAuthor, closingIssue)
    );
// IF assignee doesn't match PR author
} else {
    // warningComment on PR
    await storedFunctions.createComment(
        generalObject,
        storedVariables.warningPr(prAuthor, closingIssue)
    );
}
