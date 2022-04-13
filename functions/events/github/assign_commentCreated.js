const lib = require('lib')({
    token: process.env.STDLIB_SECRET_TOKEN
});
const settings = require('../../../exported/settings.js');
const shared = require("../../../exported/shared");
const assign = require("../../../exported/assign");

const commentCreator = context.params.event.comment.user.login;
const commentBody = context.params.event.comment.body;
const issueNumber = context.params.event.issue.number;


let storedIssue = await shared.getDataAc(issueNumber);
let devObject = await shared.getDevObject(commentCreator);
console.log('storedIssue beginning', storedIssue)
if (shared.checks.passPhrases(commentBody)) {
    if (shared.checks.queueForDev(commentCreator, storedIssue)) {
        await shared.createComment(
            issueNumber,
            settings.comments.queueDropout(commentCreator)
        );
        storedIssue = await shared.storeDevDropoutQueue(
            commentCreator,
            issueNumber,
            storedIssue
        );
        console.log('storedIssue after queueDropout', storedIssue);
    }
    if (shared.checks.optionAvailability(storedIssue, commentCreator)) {
        await shared.createComment(
            issueNumber,
            settings.comments.optionPassed(commentCreator)
        );
        storedIssue = await shared.storeDevDropoutQueue(
            commentCreator,
            issueNumber,
            storedIssue
        );
        if (shared.checks.queuedDevs(storedIssue)) {
            storedIssue = await assign.toggleOptionPeriod(
                storedIssue,
                issueNumber
            );
            await shared.createComment(
                issueNumber,
                settings.comments.optionPeriodStarted(
                    storedIssue.optionHolder,
                    storedIssue.optionPeriod
                )
            );
        }
    }
} else if (shared.checks.goPhrases(commentBody)) {
    if (shared.checks.devObjectExists(devObject)) {
        if (shared.checks.devAssignmentLimit(devObject)) {
            await shared.createComment(
                issueNumber,
                settings.comments.assignmentLimit(commentCreator, devObject.assigned)
            );
            return;
        }
        if (shared.checks.devUnfinished(devObject, issueNumber)) {
            await shared.createComment(
                issueNumber,
                settings.comments.errorUnassigned(commentCreator)
            );
            return;
        }
        if (shared.checks.devQueueDropout(devObject, issueNumber)) {
            await shared.createComment(
                issueNumber,
                settings.comments.alreadyDropout(commentCreator)
            );
            return;
        }
    }
    if (shared.checks.storedIssueExists(storedIssue)) {
        if (shared.checks.prOpened(storedIssue)) {
            await shared.createComment(
                issueNumber,
                settings.comments.errorMessagePR(commentCreator, storedIssue.prOpened)
            );
            return;
        }
        if (shared.checks.optionAvailability(storedIssue, commentCreator)) {
            storedIssue.optionHolder = null;
            storedIssue.optionPeriod = null;
            await shared.createComment(
                issueNumber,
                await settings.comments.optionUsed(commentCreator)
            );
            await assign.storeAssignComment(
                storedIssue,
                devObject,
                issueNumber,
                commentCreator
            );
            return;
        }
        if (shared.checks.assigneeIsCommentCreator(storedIssue, commentCreator)) {
            if (shared.checks.assignmentExpired(storedIssue)) {
                await assign.unassignIssue(issueNumber, commentCreator);
            } else {
                await shared.createComment(
                    issueNumber,
                    settings.comments.alreadyAssigned(
                        commentCreator,
                        storedIssue.assignmentPeriod
                    )
                );
                return;
            }
        } else if (!shared.checks.assignmentExpired(storedIssue)) {
            console.log('assignment not expired', storedIssue);
            if (!shared.checks.queueForDev(commentCreator, storedIssue)) {
                storedIssue.queue.push(commentCreator);
                await shared.storeDataAc(issueNumber, storedIssue);
                await shared.createComment(
                    issueNumber,
                    settings.comments.addedToQueue(commentCreator, storedIssue.queue)
                );
                return;
            } else {
                await shared.createComment(
                    issueNumber,
                    settings.comments.alreadyInQueue(commentCreator, storedIssue.queue)
                );
                return;
            }
        } else {
            if (shared.checks.queuedDevs(storedIssue)) {
                if (shared.checks.nextInQueueCommentCreator(storedIssue, commentCreator)) {
                    storedIssue.optionHolder = commentCreator;
                    await shared.storeDataAc(issueNumber, storedIssue);
                    await assign.unassignIssue(issueNumber, storedIssue.assignee);
                    return;
                }
                await assign.unassignIssue(issueNumber, storedIssue.assignee);
                return;
            }
            await assign.unassignIssue(issueNumber, storedIssue.assignee);
            storedIssue = await assign.handleOtherWebhook(issueNumber);
            await assign.storeAssignComment(
                storedIssue,
                devObject,
                issueNumber,
                commentCreator
            );
        }
    } else {
        await assign.storeAssignComment(
            storedIssue,
            devObject,
            issueNumber,
            commentCreator
        );
    }
}
console.log('storedIssue end', storedIssue)
