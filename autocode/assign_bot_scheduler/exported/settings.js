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

        assignmentExpired: (commentCreator) => {
            return `ASSIGNMENT EXPIRED - @${commentCreator} has been unassigned.`;
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
