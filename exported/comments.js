const moment = require('moment');
module.exports = {

    successPr: (prAuthor, closingIssue) => {
        return `SUCCESS @${prAuthor} PR for issue #${closingIssue} which is assigned to you. Please wait for review and don't hesitate to grab another issue in the meantime!`;
    },

    warningPr: (prAuthor, closingIssue) => {
        return `WARNING @${prAuthor} PR for issue #${closingIssue} which isn't assigned to you. Please be warned that this PR may get rejected if there's another assignee for issue #${closingIssue}`;
    },

    alreadyAssigned: (commentCreator, date, settings) => {
        return `ALREADY ASSIGNED @${commentCreator} 🔒 LOCKED -> ${moment(
            date
        ).format(settings.dateFormat)} UTC`;
    },

    addedToQueue: (commentCreator, queue) => {
        return `ADDED TO QUEUE @${commentCreator}. Current queue: [${queue}]`;
    },

    alreadyInQueue: (commentCreator, queue) => {
        return `ALREADY IN QUEUE @${commentCreator}, you are already in queue: [${queue}]`;
    },

    errorMessagePR: (commentCreator, prOpened) => {
        return `ERROR - @${commentCreator}, PR #${prOpened} opened for this issue! Try grabbing another one!`;
    },

    errorUnassigned: (commentCreator) => {
        return `ALREADY UNASSIGNED - @${commentCreator}, you cannot be assigned twice!`;
    },

    successAssign: (commentCreator, bountyTime, date, settings) => {
        return `ASSIGNED - @${commentCreator} 🔒 LOCKED -> ${moment(date).format(
            settings.dateFormat
        )} UTC -> ${bountyTime} hours`;
    },

    assignmentLimit: (commentCreator, assignedIssues) => {
        return `ASSIGNED ISSUES LIMIT REACHED - @${commentCreator}, you have been already assigned with 5 issues: ${assignedIssues}. Finish one of them in order to get more issues assigned!`;
    },

    assignmentExpired: (commentCreator) => {
        return `ASSIGNMENT EXPIRED - @${commentCreator} has been unassigned.`;
    },

    unassignedUser: (commentCreator) => {
        return `ASSIGNMENT OVER - @${commentCreator} has been unassigned.`;
    },

    optionPeriodStarted: (optionHolder, optionPeriod, settings) => {
        return `OPTION PERIOD STARTED - @${optionHolder}, you are next in queue. Option period -> ${
            settings.optionHours
        } hours -> ${moment(optionPeriod).format(
            settings.dateFormat
        )} UTC.`;
    },

    optionPeriodExpired: (optionHolder) => {
        return `OPTION PERIOD EXPIRED - @${optionHolder} your option period has expired.`;
    },

    optionPeriodSkipped: (optionHolder) => {
        return `OPTION PERIOD SKIPPED - @${optionHolder} you are next in queue!`;
    },

    optionUsed: (optionHolder) => {
        return `OPTION USED - @${optionHolder} option to pick issue in queue used.`;
    },

    optionPassed: (optionHolder) => {
        return `OPTION PASSED - @${optionHolder} you passed the option to pick this issue.`;
    },

    queueDropout: (devLogin) => {
        return `DROPOUT FROM QUEUE - @${devLogin} you have dropped out from queue.`;
    },

    alreadyDropout: (devLogin) => {
        return `ALREADY PASSED - @${devLogin}, you have been previously in a queue or have had an option to pick this issue and choose to pass. You can no longer participate in it.`;
    },

    payoutMultiplier: (prAuthor, savedStreak, partialComment) => {
        return `USER @${prAuthor} ELIGIBLE FOR PAYOUT MULTIPLIER, with ${savedStreak.length} assigned issues merged within 7 days. \n ${partialComment}`;
    },

    issueIgnored: (issueNumber) => {
        return `ISSUE IGNORED - issue #${issueNumber} will be ignored.`;
    },

    issueIgnoredResp: (issueNumber) => {
        return `ISSUE #${issueNumber} is ignored and cannot be assigned.`;
    },

    issueBlocked: (issueNumber) => {
        return `ISSUE BLOCKED - issue #${issueNumber} is blocked. Please wait until issue is unblocked.`;
    },

    issueResearch: (issueNumber) => {
        return `ISSUE RESEARCHED - issue #${issueNumber} is researched. Please wait until issue becomes finalized.`;

    },
};
