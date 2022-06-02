const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const settings = require('./settings.js');
const shared = require("./shared");
const assign = require("./assign");


module.exports = {
    assignIssueUnassigned: async (payload) => {
        let ghObject= {owner: payload.repository.owner.login, repo: payload.repository.name}
        let unassigned = payload.assignee.login;
        let sender = payload.sender.login;
        let issueNumber = parseInt(payload.issue.number);
        console.log(unassigned, sender, issueNumber, 'unassigned', 'sender', 'issueNumber');
        if (shared.checks.ignoredUsers(unassigned)
        ) {
            console.log("unassignment detected,", unassigned + " is ignored");
            return;
        }
        let storedIssue = await shared.getDataCf(process.env.CLDFLR_ISSUES, issueNumber);
        if (shared.checks.isIssueIgnored(storedIssue)) {
            console.log("unassignment detected,", issueNumber + " is ignored");
            return;
        }
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (storedIssue.assignee === unassigned && storedIssue.assignee === sender || storedIssue.assignee === unassigned && shared.checks.ignoredUsers(sender)) {
                let devObject = await shared.getDevObject(
                    unassigned
                );
                if (shared.checks.devObjectExists(devObject)) {
                    await shared.updateDevObject(devObject, unassigned, issueNumber, false)
                }
                if (shared.checks.storedIssueExists(storedIssue)) {
                    if (shared.checks.assignmentExpired(storedIssue)) {
                        await shared.createComment(
                            issueNumber,
                            settings.comments.assignmentExpired(storedIssue.assignee),
                            ghObject
                        )
                    } else {
                        await shared.createComment(
                            issueNumber,
                            settings.comments.unassignedUser(storedIssue.assignee),
                            ghObject
                        )
                    }
                    storedIssue.assignee = null;
                    storedIssue.timeOfAssignment = null;
                    storedIssue.assignmentPeriod = null;
                    if (shared.checks.emptyIssue(storedIssue)) {
                        await shared.deleteDataCf(process.env.CLDFLR_ISSUES, issueNumber)
                        return;
                    } else if (shared.checks.queuedDevs(storedIssue)) {
                        storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber)
                        await shared.createComment(
                            issueNumber,
                            settings.comments.optionPeriodStarted(storedIssue.optionHolder, storedIssue.optionPeriod),
                            ghObject
                        )
                    }
                }
            }
        }
    }
}
