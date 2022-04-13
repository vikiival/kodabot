const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const settings = require('../../../exported/settings');
const shared = require('../../../exported/shared');
const assign = require("../../../exported/assign");
let openAssignments = await shared.getAllDataAc();

if (openAssignments.length > 0) {
    for (let i = 0; i < openAssignments.length; i++) {
        if (settings.ignoredStorage.includes(openAssignments[i][0])) {
            continue;
        }
        let issueNumber = parseInt(openAssignments[i][0]);
        let storedIssue = openAssignments[i][1];
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (shared.checks.emptyIssue(storedIssue)) {
                await shared.deleteStoredDataAc(issueNumber)
            }
            if (!shared.checks.prOpened(storedIssue)) {
                if (shared.checks.assignmentExpired(storedIssue)) {
                    await assign.unassignIssue(issueNumber, storedIssue.assignee);
                }
                if (shared.checks.optionExpired(storedIssue)) {
                    await shared.createComment(
                        issueNumber,
                        settings.comments.optionPeriodExpired(storedIssue.optionHolder)
                    );
                    storedIssue = await shared.storeDevDropoutQueue(
                        storedIssue.optionHolder,
                        issueNumber,
                        storedIssue
                    );
                    if (shared.checks.queuedDevs(storedIssue)) {
                        storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber);
                        await shared.createComment(
                            issueNumber,
                            settings.comments.optionPeriodStarted(
                                storedIssue.optionHolder,
                                storedIssue.optionPeriod
                            )
                        );
                    } else {
                        await shared.storeDataAc(issueNumber, storedIssue);
                    }
                }
            }
        }
    }
}
