const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require('../../../exported/shared');
const assign = require("../../../exported/assign");


//////////////////
///////////////// settings need to to be solved here

let allTheKeys = await shared.getAllKeys(settings.cfIssues);

if (allTheKeys.length > 0) {
    for (let i = 0; i < allTheKeys.length; i++) {
        console.log(allTheKeys[i])
        let issueNumber = allTheKeys[i];
        let storedIssue = await shared.getDataCf(settings.cfIssues, issueNumber);
        let ghObject = {owner: storedIssue.owner, repo: storedIssue.repo}
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (shared.checks.emptyIssue(storedIssue)) {
                await shared.deleteDataCf(settings.cfIssues, issueNumber)
                continue
            }
            if (shared.checks.isIssueIgnored(storedIssue)) {
                continue
            }
            if (!shared.checks.prOpened(storedIssue)) {
                if (shared.checks.assignmentExpired(storedIssue)) {
                    await shared.createComment(issueNumber, comments.assignmentExpired(storedIssue.assignee), ghObject)
                    await shared.updateDevObject(await shared.getDataCf(settings.cfDevs, storedIssue.assignee), storedIssue.assignee, issueNumber, false)
                    storedIssue = await assign.unassignIssue(issueNumber, storedIssue, storedIssue.assignee, ghObject, settings);
                    if (shared.checks.emptyIssue(storedIssue)) {
                        await shared.deleteDataCf(settings.cfIssues, issueNumber)
                        continue
                    }
                    if (shared.checks.queuedDevs(storedIssue)) {
                        storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber);
                        await shared.createComment(
                            issueNumber,
                            comments.optionPeriodStarted(
                                storedIssue.optionHolder,
                                storedIssue.optionPeriod,
                                settings
                            ),
                            ghObject
                        );
                    }
                    continue
                }
                if (shared.checks.optionExpired(storedIssue)) {
                    await shared.createComment(
                        issueNumber,
                        comments.optionPeriodExpired(storedIssue.optionHolder),
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
                            comments.optionPeriodStarted(
                                storedIssue.optionHolder,
                                storedIssue.optionPeriod,
                                settings
                            ),
                            ghObject
                        );
                    } else {
                        await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue);
                    }
                }
            }
        }
    }
}

