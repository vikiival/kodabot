const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("./shared");
const assign = require("./assign");
const comments = require("./comments");



module.exports = {
    assignIssueUnassigned: async (payload, ghObject, settings) => {
        let unassigned = payload.assignee.login;
        let sender = payload.sender.login;
        let issueNumber = parseInt(payload.issue.number);
        console.log(unassigned, sender, issueNumber, 'unassigned', 'sender', 'issueNumber');
        if (shared.checks.ignoredUsers(unassigned, settings)
        ) {
            console.log("unassignment detected,", unassigned + " is ignored");
            return;
        }
        let storedIssue = await shared.getDataCf(settings.cfIssues, issueNumber);
        if (shared.checks.isIssueIgnored(storedIssue)) {
            console.log("unassignment detected,", issueNumber + " is ignored");
            return;
        }
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (storedIssue.assignee === unassigned && storedIssue.assignee === sender || storedIssue.assignee === unassigned && shared.checks.ignoredUsers(sender, settings)) {
                let devObject = await shared.getDevObject(
                    unassigned, settings
                );
                if (shared.checks.devObjectExists(devObject)) {
                    await shared.updateDevObject(devObject, unassigned, issueNumber, false)
                }
                if (shared.checks.storedIssueExists(storedIssue)) {
                    if (shared.checks.assignmentExpired(storedIssue)) {
                        await shared.createComment(
                            issueNumber,
                            comments.assignmentExpired(storedIssue.assignee),
                            ghObject
                        )
                    } else {
                        await shared.createComment(
                            issueNumber,
                            comments.unassignedUser(storedIssue.assignee),
                            ghObject
                        )
                    }
                    storedIssue.assignee = null;
                    storedIssue.timeOfAssignment = null;
                    storedIssue.assignmentPeriod = null;
                    if (shared.checks.emptyIssue(storedIssue)) {
                        await shared.deleteDataCf(settings.cfIssues, issueNumber)
                        return;
                    } else if (shared.checks.queuedDevs(storedIssue)) {
                        storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber)
                        await shared.createComment(
                            issueNumber,
                            comments.optionPeriodStarted(storedIssue.optionHolder, storedIssue.optionPeriod, settings),
                            ghObject
                        )
                    }
                }
            }
        }
    }
}
