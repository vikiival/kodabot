const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const functions = require('../../../exported/functions.js');
const variables = require('../../../exported/variables.js');
const checks = require('../../../exported/checks.js');
const moment = require('moment');
console.log('scheduler runs')
const now = moment()
let openAssignments = await functions.getALlDataAC(
)
console.log(openAssignments)
// get key for all open assignments
if (openAssignments.length > 0) {
    for (let i in openAssignments) {
        if (variables.ignoredStorage.includes(openAssignments[i][0])) { continue; }
        let issueNumber = openAssignments[i][0]
        let storedIssue = openAssignments[i][1]
        if (checks.checkEmptyIssue(storedIssue)) {
            await functions.deleteStoredDataAC(issueNumber)
        }
        if (checks.checkStoredIssueExists(storedIssue)) {
            if (checks.checkPrOpened(storedIssue)) {
                console.log('PR OPENED FOR ISSUE', issueNumber)
            } else {
                let generalObject = functions.generalParams(issueNumber);
                if (checks.checkAssignmentExpired(storedIssue, now)) {
                    console.log('EXPIRED ASSIGNMENT', storedIssue)
                    await functions.removeAssignee(generalObject, storedIssue.assignee)
                    return;
                }
                if (checks.checkOptionExpired(storedIssue, now)) {
                    console.log('EXPIRED OPTION PERIOD', storedIssue)
                    await functions.createComment(
                        generalObject,
                        variables.optionPeriodExpired(storedIssue.optionHolder)
                    );
                    storedIssue.optionPeriod = ''
                    storedIssue.optionHolder = ''
                    if (checks.checkedQueuedDevs(storedIssue)) {
                        await functions.toggleOption(storedIssue, generalObject, now, issueNumber)
                        await functions.createComment(
                            generalObject,
                            variables.optionPeriodStarted(storedIssue.optionHolder, storedIssue.optionPeriod)
                        );
                    }
                    await functions.storeIssueAC(
                        issueNumber,
                        storedIssue
                    );
                }
            }
        }
    }
}
