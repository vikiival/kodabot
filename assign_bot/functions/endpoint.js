const {payoutPrClosed} = require("../exported/payoutPrClosed");
const {payoutPrOpened} = require("../exported/assignPrOpened");
const {assignIssueUnassigned} = require("../exported/assignIssueUnassigned");
const {assignIssueClosed} = require("../exported/assignIssueClosed");
const {assignCommentCreated} = require("../exported/assignCommentCreated");
const {payoutCommentCreated} = require("../exported/payoutCommentCreated");
const {assignIssueAssigned} = require("../exported/assignIssueAssigned");

let webhook = `${context.http.headers['x-github-event']}_${context.params.action}`

console.log(webhook)

if (webhook === 'issue_comment_created'){
    await assignCommentCreated(context)
    // await payoutCommentCreated(context)
}
if (webhook === 'issue_comment_edited'){
    await assignCommentCreated(context)
    // await payoutCommentCreated(context)
}
if (webhook === 'issues_closed'){
    await assignIssueClosed(context)
    console.log('closed another issue!')
}
if (webhook === 'issues_unassigned') {
    await assignIssueUnassigned(context)
    console.log('issue unassigned!')
}
if (webhook === 'pull_request_opened') {
    await payoutPrOpened(context)
    console.log('pull request opened')
}

if (webhook === 'pull_request_closed') {
    await payoutPrClosed(context)
    console.log('pull request closed!')
}

if (webhook === 'issues_assigned') {
    await assignIssueAssigned(context)
    console.log('issue assigned!')
}
