const moment = require('moment');
module.exports = {

    // these need to be adjusted for sure
    leaderboardTitle: `leaderboardUpdate_${moment().format('MM-DD-YYYY')}`, // title of the pull request to be created by bot
    burnRateTitle: `burnRateUpdate_${moment().format('MM-DD-YYYY')}`, // title of the pull request to be created by bot
    tablesTitle: `[skip netlify] tablesUpdate_${moment().format('MM-DD-YYYY')}`, // title of the pull request to be created by bot
    branchName: 'kodabot', // name of the branch to be created by bot
    leaderboardPath: `kodabot:LEADERBOARD.md`, // name of the bot branch
    leaderboardFile: 'LEADERBOARD.md', // name of the leaderboard file
    burnRatePath: `kodabot:BURN_RATE.md`, // name of the bot branch
    burnRateFile: 'BURN_RATE.md', // name of the burn rate file
    ignoredUsers: ['kodabot', 'yangwao', 'vikiival', 'roiLeo'], // users which are not added to the leaderboard
    payRolledUsers: ['kodabot', 'yangwao', 'vikiival', 'roiLeo', 'petersopko'], // users which are not added to the leaderboard

    // for testing, change these
    optionHours: 12, // number of hours for option period after queue
    devAssignmentLimit: 5, // number of issues dev can get assigned at once
    mergedAndPaidLimit: 10, // number of merged and paid PRs before update of LEADERBOARD.MD
    finishedStreakLimit: 3, // number of assigned->merged->paid PRs which count as finishStreak (quadratic payments)
    timeSpan: 'hours', // timespan used to calculate assignment and option period - needs to be hours in development
    blockedLabel: 'blocked', // label used to block issues
    researchLabel: 'research',


    payoutPhrase: 'Perfect, I’ve sent the payout', // payout phrase used to target comments with info about payments
    ignoredStorage: ['mergedPulls'], // storage which is skipped with bots automatic checks of expired issues etc.
    mergedPulls: 'mergedPulls', // placeholder for storage of merged and paid PR numbers
    dateFormat: 'dddd, MMMM Do YYYY, kk:mm:ss', // dateformat used throughout bot communication
    bountyTimes: {
        $: 24,
        $$: 48,
        $$$: 72,
        $$$$: 96,
        $$$$$: 120,
    }, // bounty times in hours
    goPhrases: ['👋', '👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿', ':wave:'], // phrases used to trigger bot to take an issue
    passPhrases: ['pass'], // phrases that trigger passing of option or dropping out of queue
    ignorePhrases: ['ignore'],

    comments: {

        successPr: (prAuthor, closingIssue) => {
            return `SUCCESS @${prAuthor} PR for issue #${closingIssue} which is assigned to you. Please wait for review and don't hesitate to grab another issue in the meantime!`;
        },

        warningPr: (prAuthor, closingIssue) => {
            return `WARNING @${prAuthor} PR for issue #${closingIssue} which isn't assigned to you. Please be warned that this PR may get rejected if there's another assignee for issue #${closingIssue}`;
        },

        alreadyAssigned: (commentCreator, date) => {
            return `ALREADY ASSIGNED @${commentCreator} 🔒 LOCKED -> ${moment(
                date
            ).format(module.exports.dateFormat)} UTC`;
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

        successAssign: (commentCreator, bountyTime, date) => {
            return `ASSIGNED - @${commentCreator} 🔒 LOCKED -> ${moment(date).format(
                module.exports.dateFormat
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

        optionPeriodStarted: (optionHolder, optionPeriod) => {
            return `OPTION PERIOD STARTED - @${optionHolder}, you are next in queue. Option period -> ${
                module.exports.optionHours
            } hours -> ${moment(optionPeriod).format(
                module.exports.dateFormat
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

        streakMessageForOtherBot: (amount) => {
            amount = amount * 1.5 - amount;
            return `pay ${amount} usd`;
        },

        issueIgnored(issueNumber) {
            return `ISSUE IGNORED - issue #${issueNumber} will be ignored.`;
        },

        issueIgnoredResp(issueNumber) {
            return `ISSUE #${issueNumber} is ignored and cannot be assigned.`;
        },

        issueBlocked(issueNumber) {
            return `ISSUE BLOCKED - issue #${issueNumber} is blocked. Please wait until issue is unblocked.`;
        },

        issueResearch(issueNumber) {
            return `ISSUE RESEARCHED - issue #${issueNumber} is researched. Please wait until issue becomes finalized.`;
        }
    },
};
