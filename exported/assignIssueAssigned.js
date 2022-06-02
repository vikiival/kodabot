const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("./shared");
const assign = require("./assign");
const comments = require("./comments");


module.exports = {

    assignIssueAssigned: async (payload, ghObject, settings) => {
        const sender = payload.sender.login
        if (shared.checks.ignoredUsers(sender, settings)) {
            return;
        }
        const issueNumber = payload.issue.number;
        let storedIssue = await shared.getDataCf(settings.cfIssues, issueNumber)
        let labels = await assign.getIssueLabels(issueNumber, ghObject)
        if (shared.checks.storedIssueExists(storedIssue)) {
            return;
        } else {
            const assignee = payload.assignee.login;
            if (shared.checks.ignoredUsers(assignee, settings)) {
                return;
            } else {
                let devObject = await shared.getDevObject(assignee, settings);
                if (shared.checks.devObjectExists(devObject)) {
                    if (shared.checks.devAssignmentLimit(devObject)) {
                        await shared.createComment(
                            issueNumber,
                            comments.assignmentLimit(assignee, devObject.assigned),
                            ghObject
                        );
                        await assign.unassignIssue(issueNumber, storedIssue, assignee, ghObject, settings);
                        return;
                    }
                    if (shared.checks.devUnfinished(devObject, issueNumber)) {
                        await shared.createComment(
                            issueNumber,
                            comments.errorUnassigned(assignee),
                            ghObject
                        );
                        await assign.unassignIssue(issueNumber, storedIssue, assignee, settings);
                        return;
                    }
                    if (shared.checks.devQueueDropout(devObject, issueNumber)) {
                        await shared.createComment(
                            issueNumber,
                            comments.alreadyDropout(assignee),
                            ghObject
                        );
                        await assign.unassignIssue(issueNumber, storedIssue, assignee, ghObject, settings);
                        return;
                    }
                }
                await assign.storeAssignComment(
                    storedIssue,
                    devObject,
                    issueNumber,
                    assignee,
                    labels,
                    ghObject,
                    settings
                );
            }
        }
    }
};
