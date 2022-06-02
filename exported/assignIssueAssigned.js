const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const settings = require('./settings.js');
const shared = require("./shared");
const assign = require("./assign");


module.exports = {

    assignIssueAssigned: async (payload) => {
        let ghObject = {owner: payload.repository.owner.login, repo: payload.repository.name}
        const sender = payload.sender.login
        if (shared.checks.ignoredUsers(sender)) {
            return;
        }
        const issueNumber = payload.issue.number;
        let storedIssue = await shared.getDataCf(process.env.CLDFLR_ISSUES, issueNumber)
        let labels = await assign.getIssueLabels(issueNumber, ghObject)
        if (shared.checks.storedIssueExists(storedIssue)) {
            return;
        } else {
            const assignee = payload.assignee.login;
            if (shared.checks.ignoredUsers(assignee)) {
                return;
            } else {
                let devObject = await shared.getDevObject(assignee);
                if (shared.checks.devObjectExists(devObject)) {
                    if (shared.checks.devAssignmentLimit(devObject)) {
                        await shared.createComment(
                            issueNumber,
                            settings.comments.assignmentLimit(assignee, devObject.assigned),
                            ghObject
                        );
                        await assign.unassignIssue(issueNumber, storedIssue, assignee, ghObject);
                        return;
                    }
                    if (shared.checks.devUnfinished(devObject, issueNumber)) {
                        await shared.createComment(
                            issueNumber,
                            settings.comments.errorUnassigned(assignee),
                            ghObject
                        );
                        await assign.unassignIssue(issueNumber, storedIssue, assignee, ghObject);
                        return;
                    }
                    if (shared.checks.devQueueDropout(devObject, issueNumber)) {
                        await shared.createComment(
                            issueNumber,
                            settings.comments.alreadyDropout(assignee),
                            ghObject
                        );
                        await assign.unassignIssue(issueNumber, storedIssue, assignee, ghObject);
                        return;
                    }
                }
                await assign.storeAssignComment(
                    storedIssue,
                    devObject,
                    issueNumber,
                    assignee,
                    labels,
                    ghObject
                );
            }
        }
    }
};
