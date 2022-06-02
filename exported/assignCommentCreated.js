const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const comments = require('./comments.js');
const shared = require("./shared");
const assign = require("./assign");


module.exports = {

    assignCommentCreated: async (payload, ghObject, settings) => {
        console.log('COMMENT BODY', payload.comment.body)
        const commentCreator = payload.comment.user.login;
        const commentBody = (payload.comment.body).replace(/\s+/g, '')
        const issueNumber = payload.issue.number;
        let storedIssue = await shared.getDataCf(settings.cfIssues, issueNumber);
        let devObject = await shared.getDevObject(commentCreator, settings);
        let labels;
        payload.issue.pull_request === undefined ? labels = await assign.getIssueLabels(issueNumber, ghObject) : console.log('PR comment')

        if (shared.checks.ignoredUsers(commentCreator, settings)) {
            console.log("comment created,", commentCreator + " is ignored");
            return;
        }

        if (shared.checks.isIgnorePhrase(commentBody, settings)) {
            console.log('IGNORED PHRASE')
            let collaborators = await assign.getCollaborators(shared.queries.getCollaborators, ghObject);
            if (collaborators.includes(commentCreator)) {
                await assign.makeIssueIgnored(issueNumber, commentCreator, storedIssue, devObject, ghObject, settings)
                await shared.createComment(issueNumber, comments.issueIgnored(issueNumber), ghObject);
                console.log('ignored issue,', await shared.getDataCf(settings.cfIssues, issueNumber))
                return
            }
        }
        if (shared.checks.passPhrases(commentBody, settings)) {
            console.log("Passphrase detected", commentCreator, issueNumber);
            if (shared.checks.queueForDev(commentCreator, storedIssue)) {
                await shared.createComment(
                    issueNumber,
                    comments.queueDropout(commentCreator),
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
                    comments.optionPassed(commentCreator),
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
                        comments.optionPeriodStarted(
                            storedIssue.optionHolder,
                            storedIssue.optionPeriod,
                            settings
                        ),
                        ghObject
                    );
                }
                return;
            }
        } else if (shared.checks.goPhrases(commentBody, settings)) {
            console.log("Go phrase detected", commentCreator, issueNumber);
            if (shared.checks.isIssueIgnored(storedIssue)) {
                console.log("comment created,", issueNumber + " is ignored");
                await shared.createComment(
                    issueNumber,
                    comments.issueIgnoredResp(issueNumber),
                    ghObject
                );
                return;
            }
            if (shared.checks.isIssueBlocked(labels, settings)) {
                console.log("comment created,", issueNumber + " is blocked");
                await shared.createComment(
                    issueNumber,
                    comments.issueBlocked(issueNumber),
                    ghObject
                );
                return;
            }
            if (shared.checks.isIssueResearched(labels, settings)){
                console.log("comment created,", issueNumber + " is researched");
                await shared.createComment(
                    issueNumber,
                    comments.issueResearch(issueNumber),
                    ghObject
                );
                return;
            }
            if (shared.checks.devObjectExists(devObject)) {
                if (shared.checks.devAssignmentLimit(devObject)) {
                    await shared.createComment(
                        issueNumber,
                        comments.assignmentLimit(commentCreator, devObject.assigned),
                        ghObject
                    );
                    return;
                }
                if (shared.checks.devUnfinished(devObject, issueNumber)) {
                    await shared.createComment(
                        issueNumber,
                        comments.errorUnassigned(commentCreator),
                        ghObject
                    );
                    return;
                }
                if (shared.checks.devQueueDropout(devObject, issueNumber)) {
                    await shared.createComment(
                        issueNumber,
                        comments.alreadyDropout(commentCreator),
                        ghObject
                    );
                    return;
                }
            }
            if (shared.checks.storedIssueExists(storedIssue)) {
                if (shared.checks.prOpened(storedIssue)) {
                    await shared.createComment(
                        issueNumber,
                        comments.errorMessagePR(commentCreator, storedIssue.prOpened),
                        ghObject
                    );
                    return;
                }
                if (shared.checks.assigneeIsCommentCreator(storedIssue, commentCreator)) {
                    if (shared.checks.assignmentExpired(storedIssue)) {
                        await shared.createComment(
                            issueNumber,
                            comments.assignmentExpired(commentCreator),
                            ghObject
                        );
                        storedIssue = await assign.unassignIssue(issueNumber, storedIssue, commentCreator, ghObject, settings);
                        await shared.updateDevObject(devObject, commentCreator, issueNumber, false);
                        if (shared.checks.queuedDevs(storedIssue)) {
                            storedIssue = await assign.toggleOptionPeriod(
                                storedIssue,
                                issueNumber
                            );
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
                        return;
                    } else {
                        await shared.createComment(
                            issueNumber,
                            comments.alreadyAssigned(
                                commentCreator,
                                storedIssue.assignmentPeriod,
                                settings
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
                        comments.optionUsed(commentCreator),
                        ghObject
                    );
                    await assign.storeAssignComment(
                        storedIssue,
                        devObject,
                        issueNumber,
                        commentCreator,
                        labels,
                        ghObject,
                        settings
                    );
                    return;
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
                    )
                    if (shared.checks.queuedDevs(storedIssue)) {
                        if (shared.checks.nextInQueueCommentCreator(storedIssue, commentCreator)) {
                            await shared.createComment(
                                issueNumber,
                                comments.optionPeriodSkipped(commentCreator)),
                                ghObject
                            await assign.removeDevFromQueue(storedIssue, commentCreator);
                            await assign.storeAssignComment(
                                storedIssue,
                                devObject,
                                issueNumber,
                                commentCreator,
                                labels,
                                ghObject,
                                settings
                            );
                        } else {
                            storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber)
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
                    }
                    return
                }
                if (shared.checks.assignmentExpired(storedIssue)) {
                    await shared.createComment(
                        issueNumber,
                        comments.assignmentExpired(storedIssue.assignee),
                        ghObject
                    );
                    await shared.updateDevObject(await shared.getDataCf(settings.cfDevs, storedIssue.assignee), storedIssue.assignee, issueNumber, false);
                    storedIssue = await assign.unassignIssue(issueNumber, storedIssue, storedIssue.assignee, ghObject, settings)
                    if (shared.checks.queuedDevs(storedIssue)) {
                        if (shared.checks.nextInQueueCommentCreator(storedIssue, commentCreator)) {
                            await shared.createComment(
                                issueNumber,
                                comments.optionPeriodSkipped(commentCreator)),
                                ghObject
                            await assign.removeDevFromQueue(storedIssue, commentCreator);
                            await assign.storeAssignComment(
                                storedIssue,
                                devObject,
                                issueNumber,
                                commentCreator,
                                labels,
                                ghObject,
                                settings
                            );
                            return;
                        } else {
                            storedIssue = await assign.toggleOptionPeriod(storedIssue, issueNumber)
                            await shared.createComment(
                                issueNumber,
                                comments.optionPeriodStarted(
                                    storedIssue.optionHolder,
                                    storedIssue.optionPeriod,
                                    settings
                                ),
                                ghObject
                            );
                            storedIssue.queue.push(commentCreator);
                            await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue);
                            await shared.createComment(
                                issueNumber,
                                comments.addedToQueue(commentCreator, storedIssue.queue),
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
                            ghObject,
                            settings
                        );
                    }

                } else if (!shared.checks.queueForDev(commentCreator, storedIssue)) {
                    storedIssue.queue.push(commentCreator);
                    await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue);
                    await shared.createComment(
                        issueNumber,
                        comments.addedToQueue(commentCreator, storedIssue.queue),
                        ghObject
                    );
                    return;
                } else {
                    await shared.createComment(
                        issueNumber,
                        comments.alreadyInQueue(commentCreator, storedIssue.queue),
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
                    ghObject,
                    settings
                );
            }
        }
    }
}
