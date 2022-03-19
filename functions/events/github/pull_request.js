const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const storedFunctions = require('../../../exported/storedFunctions.js');
const storedVariables = require('../../../exported/storedVariables.js');

const prBody = context.params.event.pull_request.body;
const prNumber = context.params.event.pull_request.number;
const prAuthor = context.params.event.pull_request.user.login;

let closingIssue = storedVariables.prClosingIssue(prBody).toString().trim();
let generalObject = storedFunctions.generalParams(prNumber);

// try to pull data from cf about issue which is being closed by this PR
let storedIssue = await storedFunctions.getStoredData(
    process.env.CLDFLR_ISSUES_NAMESPACE,
    closingIssue
);

// if assignee matches author
if (storedIssue.assignee === prAuthor) {
    storedIssue.prOpened = prNumber;
    // store issue data and connected PR
    await storedFunctions.storeData(
        process.env.CLDFLR_ISSUES_NAMESPACE,
        storedIssue,
        closingIssue
    );
    // success comment on PR
    await storedFunctions.createComment(
        generalObject,
        storedVariables.successPr(prAuthor, closingIssue)
    );
    // if assignee doesn't match author
} else {
    // warning comment on PR
    await storedFunctions.createComment(
        generalObject,
        storedVariables.warningPr(prAuthor, closingIssue)
    );
}
