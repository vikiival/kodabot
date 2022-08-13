const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const settings = require('../../../exported/settings');
const shared = require('../../../exported/shared');
const assign = require("../../../exported/assign");
let openAssignments = await shared.getAllDataAc();

if (openAssignments.length > 0) {
    for (let i = 0; i < openAssignments.length; i++) {
        console.log(openAssignments[i])
        if (settings.ignoredStorage.includes(openAssignments[i][0])) {
            continue;
        }
        let issueNumber = parseInt(openAssignments[i][0]);
        let storedIssue = openAssignments[i][1];
        let ghObject = {owner: storedIssue.owner, repo: storedIssue.repo}
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (shared.checks.emptyIssue(storedIssue)) {
                await shared.deleteStoredDataAc(issueNumber)
                continue
            }
            if (shared.checks.isIssueIgnored(storedIssue)) {
                continue
            }
            if (!shared.checks.prOpened(storedIssue)) {
                if (shared.checks.assignmentExpired(storedIssue)) {
                    await shared.createComment(issueNumber, settings.comments.assignmentExpired(storedIssue.assignee), ghObject)
                    await shared.updateDevObject(await shared.getDataCf(process.env.CLDFLR_DEVS, storedIssue.assignee), storedIssue.assignee, issueNumber, false)
                    storedIssue = await assign.unassignIssue(issueNumber, storedIssue, storedIssue.assignee, ghObject);
                    if (shared.checks.emptyIssue(storedIssue)) {
                        await shared.deleteStoredDataAc(issueNumber)
                        continue
                    }
                    if (shared.checks.queuedDevs(storedIssue)) {
                        storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber);
                        await shared.createComment(
                            issueNumber,
                            settings.comments.optionPeriodStarted(
                                storedIssue.optionHolder,
                                storedIssue.optionPeriod
                            ),
                            ghObject
                        );
                    }
                    continue
                }
                if (shared.checks.optionExpired(storedIssue)) {
                    await shared.createComment(
                        issueNumber,
                        settings.comments.optionPeriodExpired(storedIssue.optionHolder),
                        ghObject
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
                            ),
                            ghObject
                        );
                    } else {
                        await shared.storeDataAc(issueNumber, storedIssue);
                    }
                }
            }
        }
    }
}
