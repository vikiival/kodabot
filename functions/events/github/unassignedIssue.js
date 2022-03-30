const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const functions = require('../../../exported/functions.js');
const variables = require('../../../exported/variables.js');
const checks = require('../../../exported/checks.js');
const moment = require('moment');

unassigned = context.params.event.assignee.login;
sender = context.params.event.sender.login;
issueNumber = context.params.event.issue.number;
const now = moment();
const generalObject = functions.generalParams(issueNumber);
let storedIssue = await functions.getStoredDataAC(
    issueNumber
);
let devInfo = await functions.getDevInfo(
    process.env.CLDFLR_DEVS,
    unassigned
);
console.log('pulled dev data', devInfo)
// if issue data exists
if (checks.checkStoredIssueExists(storedIssue)) {
    // if unassigned trigger is assignee
    if (storedIssue.assignee === unassigned) {
        // comment assigment expired
        if (checks.checkAssignmentExpired(storedIssue, now)) {
            await functions.createComment(
                generalObject,
                variables.assignmentExpired(storedIssue.assignee)
            )
        } else {
            await functions.createComment(
                generalObject,
                variables.unassignedUser(storedIssue.assignee)
            )
        }
        storedIssue.assignee = '';
        storedIssue.lockedPeriod = '';
    }
    if (checks.checkedQueuedDevs(storedIssue)) {
        if (checks.checkNextInQueue(storedIssue)) {
            await functions.createComment(
                generalObject,
                variables.optionPeriodSkipped(storedIssue.optionHolder, storedIssue.optionPeriod))
            storedIssue = functions.removeOptionHolderFromQueue(storedIssue)
            let skippedOptionHolder = storedIssue.optionHolder
            storedIssue.optionHolder = ''
            storedIssue.optionPeriod = ''
            await functions.storeAssignComment(
                generalObject,
                storedIssue,
                devInfo,
                issueNumber,
                skippedOptionHolder,
                now
            )
        } else {
            await functions.toggleOption(storedIssue, generalObject, now, issueNumber)
            await functions.createComment(
                generalObject,
                variables.optionPeriodStarted(storedIssue.optionHolder, storedIssue.optionPeriod)
            )
        }
    } else {
        if (checks.checkEmptyIssue(storedIssue)) {
            await functions.deleteStoredDataAC(issueNumber)
        } else {
            await functions.storeIssueAC(issueNumber, storedIssue);
        }
    }
}
// if dev info exists, remove issue from assigned and push it into unassigned
if (checks.checkDevInfoExists(devInfo)) {
    await functions.devInfoUpdate(devInfo, unassigned, issueNumber, false)
}
