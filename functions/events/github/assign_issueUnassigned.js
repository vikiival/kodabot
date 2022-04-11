const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const settings = require('../../../exported/settings.js');
const shared = require("../../../exported/shared");
const assign = require("../../../exported/assign");

let unassigned = context.params.event.assignee.login;
let issueNumber = parseInt(context.params.event.issue.number);

if (shared.checks.ignoredUsers(unassigned)) {
  return;
}
let storedIssue = await shared.getDataAc(
    issueNumber
);
let devObject = await shared.getDevObject(
    unassigned
);
if (shared.checks.devObjectExists(devObject)) {
    await shared.updateDevObject(devObject, unassigned, issueNumber, false)
}
if (shared.checks.storedIssueExists(storedIssue)) {
    if (storedIssue.assignee === unassigned) {
        if (shared.checks.assignmentExpired(storedIssue)) {
            await shared.createComment(
                issueNumber,
                settings.comments.assignmentExpired(storedIssue.assignee)
            )
        } else {
            await shared.createComment(
                issueNumber,
                settings.comments.unassignedUser(storedIssue.assignee)
            )
        }
        storedIssue.assignee = null;
        storedIssue.timeOfAssignment = null;
        storedIssue.assignmentPeriod = null;
        if (shared.checks.emptyIssue(storedIssue)) {
            await shared.deleteStoredDataAc(issueNumber)
        } else {
            await shared.storeDataAc(issueNumber, storedIssue);
        }
    }
    if (shared.checks.queuedDevs(storedIssue)) {
        console.log('storedIssue1', storedIssue);
        if (shared.checks.nextInQueueOptionHolder(storedIssue)) {
            console.log('next in queue was option holder', storedIssue)
            await shared.createComment(
                issueNumber,
                settings.comments.optionPeriodSkipped(storedIssue.optionHolder, storedIssue.optionPeriod))
            storedIssue = assign.removeDevFromQueue(storedIssue, storedIssue.optionHolder)
            let skippedOptionHolder = storedIssue.optionHolder
            storedIssue.optionHolder = null
            storedIssue.optionPeriod = null
            devObject = await shared.getDevObject(skippedOptionHolder)
            await assign.storeAssignComment(
                storedIssue,
                devObject,
                issueNumber,
                skippedOptionHolder
            )
        } else {
            storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber)
            console.log('toggledOptionPeriod', storedIssue)
            await shared.createComment(
                issueNumber,
                settings.comments.optionPeriodStarted(storedIssue.optionHolder, storedIssue.optionPeriod)
            )
        }
        await shared.storeDataAc(issueNumber, storedIssue);
    }
}

