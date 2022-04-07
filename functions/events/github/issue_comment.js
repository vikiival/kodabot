const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const functions = require('../../../exported/functions.js');
const variables = require('../../../exported/variables.js');
const checks = require('../../../exported/checks.js');
const moment = require('moment');

const commentCreator = context.params.event.comment.user.login;
const commentBody = context.params.event.comment.body;
const issueNumber = context.params.event.issue.number;
const generalObject = functions.generalParams(issueNumber);
const now = moment();

// IF COMMENT concerning Payout Leaderboard
if (checks.checkPayoutPhrases(commentBody)) {
    console.log('PAYOUT REGISTERED');
    // PULL NEEDS REFACTOR BECAUSE OF storeIssueAC
    // try to pull data about previously stored Pull Object from cf (solving failed transactions)
    let storedPull = await functions.getStoredData(
        process.env.CLDFLR_PULLS,
        issueNumber
    );
    // IF there is stored Pull Object
    if (storedPull.result !== null) {
        // PUSH new transaction into array of transactions bound to this PR
        prObject = functions.makePullObject(
            await functions.getPull(generalObject),
            commentBody
        );
        storedPull.transactions.push(prObject.transactions[0]);
        await functions.storeData(
            process.env.CLDFLR_PULLS,
            storedPull,
            issueNumber
        );
        // IF there is no stored Pull Object, store new with data described in readme.md
    } else {
        prObject = functions.makePullObject(
            await functions.getPull(generalObject),
            commentBody
        );
        await functions.storeData(
            process.env.CLDFLR_PULLS,
            prObject,
            issueNumber
        );
    }
}
// IF COMMENT created by ignoredUsers
else if (checks.checkForIgnoredUsers(commentCreator)) {
    console.log('COMMENT CREATED BY IGNORED USER');
    return true;
}

// IF COMMENT doesn't include goPhrase
else if (!checks.checkForGoPhrases(commentBody)) {
    console.log('COMMENT WITHOUT GO PHRASE');
    return true;

// IF COMMENT includes goPhrase
} else {
    console.log('THERE WAS A GO PHRASE:', commentBody);

    // CHECK DEV ELIGIBILITY
    let devInfo = await functions.getDevInfo(
        process.env.CLDFLR_DEVS,
        commentCreator
    );
    if (checks.checkDevInfoExists(devInfo)) {
        if (await checks.checkDevAssignmentLimit(devInfo)) {
            await functions.createComment(
                generalObject,
                variables.assignedLimit(commentCreator, devInfo.assigned)
            );
            return;
        }
        if (await checks.checkDevUnfinished(devInfo, issueNumber)) {
            await functions.createComment(
                generalObject,
                variables.errorUnassigned(commentCreator)
            );
            return;
        }
    }
    // CHECK ISSUE ELIGIBILITY
    let storedIssue = await functions.getStoredDataAC(
        issueNumber
    );
    console.log('before checks,d storedIssue:', storedIssue)
    console.log('before checks, storedIssue !== null', storedIssue !== null)
    if (checks.checkStoredIssueExists(storedIssue)) {
        console.log('issue exists, check1')
        // IF PR was already opened
        // POSSIBLY HANDLE QUEUE HERE
        if (checks.checkPrOpened(storedIssue)) {
            await functions.createComment(
                generalObject,
                variables.errorMessagePR(commentCreator, storedIssue.prOpened)
            );
            return;
        }
        // IF OPTION is available for Dev
        if (checks.checkOptionAvailability(storedIssue, commentCreator, now)) {
            console.log('option was available')
            storedIssue.optionHolder = '';
            storedIssue.optionPeriod = '';
            await functions.createComment(
                generalObject, await variables.optionUsed(commentCreator));
            await functions.storeAssignComment(
                generalObject,
                storedIssue,
                devInfo,
                issueNumber,
                commentCreator,
                now
            );
            return;
        }
        // IF goPhrase author IS current assignee of stored Issue Object
        if (storedIssue.assignee === commentCreator) {
            console.log('assignee matches comment creator, check 2')
            // AND lockedPeriod continues
            if (!(checks.checkAssignmentExpired(storedIssue, now))) {
                // COMMENT alreadyAssigned
                await functions.createComment(
                    generalObject,
                    variables.alreadyAssigned(
                        commentCreator,
                        storedIssue.lockedPeriod
                    )
                );
                return;
                // AND lockedPeriod expired
            } else {
                // COMMENT cannotAssignAgain
                await functions.createComment(
                    generalObject,
                    variables.cannotAssignAgain(
                        commentCreator,
                        storedIssue.lockedPeriod
                    )
                );
            }
            // IF goPhrase author NOT current assignee of stored Issue Object
            // AND lockedPeriod continues
        } else if (!(checks.checkAssignmentExpired(storedIssue, now))) {
            console.log('assignment continues?')
            // ADD TO QUEUE
            storedIssue.queue.push(commentCreator);
            await functions.storeIssueAC(
                issueNumber,
                storedIssue
            );
            await functions.createComment(
                generalObject,
                variables.addedToQueue(storedIssue.lockedPeriod, commentCreator)
            );
            return
            // IF goPhrase NOT current assignee of stored Issue Object
            // AND lockedPeriod is over
        } else {
            // REMOVE ASSIGNMENT
            if (checks.checkedQueuedDevs(storedIssue)) {
                if (storedIssue.queue[0] === commentCreator){
                    storedIssue.optionHolder = commentCreator
                    await functions.storeIssueAC(issueNumber, storedIssue)
                    await functions.removeAssignee(generalObject, storedIssue.assignee);
                    return
                }
                await functions.removeAssignee(generalObject, storedIssue.assignee);
                // GET updated object
                storedIssue = await functions.handleOtherWebhook(issueNumber);
                // QUEUE handled in unassignment.js, ending here
                return
            }
            await functions.removeAssignee(generalObject, storedIssue.assignee);
            // GET updated object
            storedIssue = await functions.handleOtherWebhook(issueNumber);
            // ASSIGN AND COMMENT
            await functions.storeAssignComment(
                generalObject,
                storedIssue,
                devInfo,
                issueNumber,
                commentCreator,
                now
            );
        }
        // IF no stored Issue Object exists
    } else {
        console.log('it got to the end?')
        // STORE, ASSIGN AND COMMENT
        await functions.storeAssignComment(
            generalObject,
            storedIssue,
            devInfo,
            issueNumber,
            commentCreator,
            now
        );
    }
}
