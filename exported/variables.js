const moment = require('moment');
module.exports = {
    dateFormat: 'dddd, MMMM Do YYYY, kk:mm:ss',
    ignoredUsers: ['bunch of comment creators you would like to skip checking'],
    ignoredStorage: ['tempPulls', 'unpaidPulls'],
    bountyTimes: {
        $: 24,
        $$: 48,
        $$$: 72,
        $$$$: 96,
        $$$$$: 120,
    },
    optionHours: 12,
    //phrase triggering storing of Pull Object
    payoutPhrase: 'Perfect, I’ve sent the payout',
    //phrases triggering storing of Issue Object
    goPhrases: [
        'I take this',
        'I take this.',
        "I'll take this",
        "I'll take this.",
        'I will take this',
        'I will take this.',
        'i will take this',
        'i take this',
        'i take this.',
        'ill take this',
        'ill take this.',
    ],
    tableHeader: `| GitHub_Handle   | Total_Amount_Received | Amount_Received_to_Merged_PRs | Num_Of_Open_PRs | Merged_PRs | Closed_PRs | Lines_Added_to_Lines_Removed | Total_Commits_Merged | Last_Transaction_Link  |
|-----------------|-----------------------|-------------------------------|-----------------|------------|------------|------------------------------|----------------------|------------------------------------------------------------------------------------------------------------------------------------|  \n`,

    prClosingIssue: (prBody) => {
        return prBody
            .split('PR closes #')[1]
            .slice(0, 5)
            .replace(/[^a-z0-9]/gi, '');
    },

    successPr: (prAuthor, closingIssue) => {
        return `SUCCESS @${prAuthor} PR for issue #${closingIssue} which is assigned to you. Please wait for review and don't hesitate to grab another issue in the meantime!`;
    },

    warningPr: (prAuthor, closingIssue) => {
        return `WARNING @${prAuthor} PR for issue #${closingIssue} which isn't assigned to you. Please be warned that this PR may get rejected if there's another assignee for issue #${closingIssue}`;
    },

    alreadyAssigned: (commentCreator, date) => {
        return `ALREADY ASSIGNED @${commentCreator} 🔒 LOCKED -> ${moment(date).format(module.exports.dateFormat)} UTC`;
    },

    addedToQueue: (date, commentCreator) => {
        return `ADDED TO QUEUE - 🔒 LOCKED -> ${moment(date)
            .format(module.exports.dateFormat)} UTC. @${commentCreator} your option to be assigned next starts after locked period.`;
    },

    cannotAssignAgain: (commentCreator, date) => {
        return `ERROR - @${commentCreator} 🔒 Locked period expired -> ${moment(date)
            .format(
                module.exports.dateFormat
            )} UTC. If you are close to finishing this issue, open PR to ensure nobody else grabs it!`;
    },

    errorMessagePR: (commentCreator, prOpened) => {
        return `ERROR - @${commentCreator}, PR #${prOpened} opened for this issue! Try grabbing another one!`;
    },

    errorUnassigned: (commentCreator) => {
        return `ALREADY UNASSIGNED - @${commentCreator}, cannot be assigned twice!`;
    },

    successAssign: (commentCreator, bountyTime, date) => {
        return `ASSIGNED - @${commentCreator} 🔒 LOCKED -> ${moment(date)
            .format(module.exports.dateFormat)} UTC -> ${bountyTime} hours`;
    },
    assignedLimit: (commentCreator, assignedIssues) => {
        return `ASSIGNED ISSUES LIMIT REACHED - @${commentCreator}, you have been already assigned with 5 issues: ${assignedIssues}. Finish one of them in order to get more issues assigned!`;
    },
    assignmentExpired: (commentCreator) => {
        return `ASSIGNMENT EXPIRED - @${commentCreator} has been unassigned.`;
    },
    unassignedUser: (commentCreator) => {
        return `ASSIGNMENT OVER - @${commentCreator} has been unassigned.`;
    },

    optionPeriodStarted: (optionHolder, optionPeriod) => {
        return `OPTION PERIOD STARTED - @${optionHolder}, you are next in queue. Option period -> ${module.exports.optionHours} hours -> ${moment(optionPeriod).format(module.exports.dateFormat)} UTC.`;
    },
    optionPeriodExpired: (optionHolder) => {
        return `OPTION PERIOD EXPIRED - @${optionHolder} your option period has expired.`
    },
    optionPeriodSkipped: (optionHolder) => {
        return `OPTION PERIOD SKIPPED - @${optionHolder} you are next in queue!`
    },

    optionUsed: (optionHolder) => {
        return `OPTION USED - @${optionHolder} option to pick issue in queue used.`
    }
}
