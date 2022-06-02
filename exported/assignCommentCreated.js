const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const settings = require('./settings.js');
const shared = require("./shared");
const assign = require("./assign");


module.exports = {

    assignCommentCreated: async (payload) => {
        console.log('COMMENT BODY', payload.comment.body)
        let ghObject = {owner: payload.repository.owner.login, repo: payload.repository.name}
        const commentCreator = payload.comment.user.login;
        const commentBody = (payload.comment.body).replace(/\s+/g, '')
        const issueNumber = payload.issue.number;
        let storedIssue = await shared.getDataCf(process.env.CLDFLR_ISSUES, issueNumber);
        let devObject = await shared.getDevObject(commentCreator);
        let labels;
        payload.issue.pull_request === undefined ? labels = await assign.getIssueLabels(issueNumber, ghObject) : console.log('PR comment')

        if (shared.checks.ignoredUsers(commentCreator)) {
            console.log("comment created,", commentCreator + " is ignored");
            return;
        }

        if (shared.checks.isIgnorePhrase(commentBody)) {
            console.log('IGNORED PHRASE')
            let collaborators = await assign.getCollaborators(shared.queries.getCollaborators, ghObject);
            if (collaborators.includes(commentCreator)) {
                await assign.makeIssueIgnored(issueNumber, commentCreator, storedIssue, devObject, ghObject)
                await shared.createComment(issueNumber, settings.comments.issueIgnored(issueNumber), ghObject);
                console.log('ignored issue,', await shared.getDataCf(process.env.CLDFLR_ISSUES, issueNumber))
                return
            }
        }
        if (shared.checks.passPhrases(commentBody)) {
            console.log("Passphrase detected", commentCreator, issueNumber);
            if (shared.checks.queueForDev(commentCreator, storedIssue)) {
                await shared.createComment(
                    issueNumber,
                    settings.comments.queueDropout(commentCreator),
                    ghObject
                );
                storedIssue = await shared.storeDevDropoutQueue(
                    commentCreator,
                    issueNumber,
                    storedIssue
                );
                return;
            }
            if (shared.checks.optionAvailability(storedIssue, commentCreator)) {
                await shared.createComment(
                    issueNumber,
                    settings.comments.optionPassed(commentCreator),
                    ghObject
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
                        ),
                        ghObject
                    );
                }
                return;
            }
        } else if (shared.checks.goPhrases(commentBody)) {
            console.log("Go phrase detected", commentCreator, issueNumber);
            if (shared.checks.isIssueIgnored(storedIssue)) {
                console.log("comment created,", issueNumber + " is ignored");
                await shared.createComment(
                    issueNumber,
                    settings.comments.issueIgnoredResp(issueNumber),
                    ghObject
                );
                return;
            }
            if (shared.checks.isIssueBlocked(labels)) {
                console.log("comment created,", issueNumber + " is blocked");
                await shared.createComment(
                    issueNumber,
                    settings.comments.issueBlocked(issueNumber),
                    ghObject
                );
                return;
            }
            if (shared.checks.isIssueResearched(labels)){
                console.log("comment created,", issueNumber + " is researched");
                await shared.createComment(
                    issueNumber,
                    settings.comments.issueResearch(issueNumber),
                    ghObject
                );
                return;
            }
            if (shared.checks.devObjectExists(devObject)) {
                if (shared.checks.devAssignmentLimit(devObject)) {
                    await shared.createComment(
                        issueNumber,
                        settings.comments.assignmentLimit(commentCreator, devObject.assigned),
                        ghObject
                    );
                    return;
                }
                if (shared.checks.devUnfinished(devObject, issueNumber)) {
                    await shared.createComment(
                        issueNumber,
                        settings.comments.errorUnassigned(commentCreator),
                        ghObject
                    );
                    return;
                }
                if (shared.checks.devQueueDropout(devObject, issueNumber)) {
                    await shared.createComment(
                        issueNumber,
                        settings.comments.alreadyDropout(commentCreator),
                        ghObject
                    );
                    return;
                }
            }
            if (shared.checks.storedIssueExists(storedIssue)) {
                if (shared.checks.prOpened(storedIssue)) {
                    await shared.createComment(
                        issueNumber,
                        settings.comments.errorMessagePR(commentCreator, storedIssue.prOpened),
                        ghObject
                    );
                    return;
                }
                if (shared.checks.assigneeIsCommentCreator(storedIssue, commentCreator)) {
                    if (shared.checks.assignmentExpired(storedIssue)) {
                        await shared.createComment(
                            issueNumber,
                            settings.comments.assignmentExpired(commentCreator),
                            ghObject
                        );
                        storedIssue = await assign.unassignIssue(issueNumber, storedIssue, commentCreator, ghObject);
                        await shared.updateDevObject(devObject, commentCreator, issueNumber, false);
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
                                ),
                                ghObject
                            );
                        }
                        return;
                    } else {
                        await shared.createComment(
                            issueNumber,
                            settings.comments.alreadyAssigned(
                                commentCreator,
                                storedIssue.assignmentPeriod
                            ),
                            ghObject
                        );
                    }
                    return;
                }
                if (shared.checks.optionAvailability(storedIssue, commentCreator)) {
                    storedIssue.optionHolder = null;
                    storedIssue.optionPeriod = null;
                    await shared.createComment(
                        issueNumber,
                        settings.comments.optionUsed(commentCreator),
                        ghObject
                    );
                    await assign.storeAssignComment(
                        storedIssue,
                        devObject,
                        issueNumber,
                        commentCreator,
                        labels,
                        ghObject
                    );
                    return;
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
                    )
                    if (shared.checks.queuedDevs(storedIssue)) {
                        if (shared.checks.nextInQueueCommentCreator(storedIssue, commentCreator)) {
                            await shared.createComment(
                                issueNumber,
                                settings.comments.optionPeriodSkipped(commentCreator)),
                                ghObject
                            await assign.removeDevFromQueue(storedIssue, commentCreator);
                            await assign.storeAssignComment(
                                storedIssue,
                                devObject,
                                issueNumber,
                                commentCreator,
                                labels,
                                ghObject
                            );
                        } else {
                            storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber)
                            await shared.createComment(
                                issueNumber,
                                settings.comments.optionPeriodStarted(
                                    storedIssue.optionHolder,
                                    storedIssue.optionPeriod
                                ),
                                ghObject
                            );
                        }
                    }
                    return
                }
                if (shared.checks.assignmentExpired(storedIssue)) {
                    await shared.createComment(
                        issueNumber,
                        settings.comments.assignmentExpired(storedIssue.assignee),
                        ghObject
                    );
                    await shared.updateDevObject(await shared.getDataCf(process.env.CLDFLR_DEVS, storedIssue.assignee), storedIssue.assignee, issueNumber, false);
                    storedIssue = await assign.unassignIssue(issueNumber, storedIssue, storedIssue.assignee, ghObject)
                    if (shared.checks.queuedDevs(storedIssue)) {
                        if (shared.checks.nextInQueueCommentCreator(storedIssue, commentCreator)) {
                            await shared.createComment(
                                issueNumber,
                                settings.comments.optionPeriodSkipped(commentCreator)),
                                ghObject
                            await assign.removeDevFromQueue(storedIssue, commentCreator);
                            await assign.storeAssignComment(
                                storedIssue,
                                devObject,
                                issueNumber,
                                commentCreator,
                                labels,
                                ghObject
                            );
                            return;
                        } else {
                            storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber)
                            await shared.createComment(
                                issueNumber,
                                settings.comments.optionPeriodStarted(
                                    storedIssue.optionHolder,
                                    storedIssue.optionPeriod
                                ),
                                ghObject
                            );
                            storedIssue.queue.push(commentCreator);
                            await shared.storeDataCf(process.env.CLDFLR_ISSUES, issueNumber, storedIssue);
                            await shared.createComment(
                                issueNumber,
                                settings.comments.addedToQueue(commentCreator, storedIssue.queue),
                                ghObject
                            );
                        }
                        return;
                    } else {
                        await assign.storeAssignComment(
                            storedIssue,
                            devObject,
                            issueNumber,
                            commentCreator,
                            labels,
                            ghObject
                        );
                    }

                } else if (!shared.checks.queueForDev(commentCreator, storedIssue)) {
                    storedIssue.queue.push(commentCreator);
                    await shared.storeDataCf(process.env.CLDFLR_ISSUES, issueNumber, storedIssue);
                    await shared.createComment(
                        issueNumber,
                        settings.comments.addedToQueue(commentCreator, storedIssue.queue),
                        ghObject
                    );
                    return;
                } else {
                    await shared.createComment(
                        issueNumber,
                        settings.comments.alreadyInQueue(commentCreator, storedIssue.queue),
                        ghObject
                    );
                    return;
                }

            } else {
                await assign.storeAssignComment(
                    storedIssue,
                    devObject,
                    issueNumber,
                    commentCreator,
                    labels,
                    ghObject
                );
            }
        }
    }
}
