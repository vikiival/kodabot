const moment = require('moment-timezone');
module.exports = {
    payoutPhrase: 'Perfect, I’ve sent the payout',
    dateFormat: 'dddd, MMMM Do YYYY, kk:mm:ss',
    ignoredUsers: ['bunch of users youd like to skip'],
    bountyTimes: {
        $: 24,
        $$: 48,
        $$$: 72,
        $$$$: 96,
        $$$$$: 120,
    },
    goPhrases: [
        'I take this',
        'I take this.',
        "I'll take this",
        "I'll take this.",
        'I will take this',
        'I will take this.',
        'i take this',
        'i take this.',
        'ill take this',
        'ill take this.',
    ],

    prClosingIssue: (prBody) => {
        return prBody
            .split('PR closes #')[1]
            .slice(0, 5)
            .replace(/[^a-z0-9]/gi, '');
    },

    successPr: (prAuthor, closingIssue) => {
        return `SUCCESS - @${prAuthor} you've successfully opened PR for issue #${closingIssue} which has been assigned to you. Please wait for review and don't hesitate to grab another issue in the meantime!`;
    },

    warningPr: (prAuthor, closingIssue) => {
        return `WARNING - @${prAuthor} you have opened PR for issue #${closingIssue} which isn't assigned to you. Please be warned that this PR may get rejected if there's another assignee for issue #${closingIssue}`;
    },

    alreadyAssigned: (commentCreator, date) => {
        return `ALREADY ASSIGNED - @${commentCreator}, you are already assigned to this issue 🔒 Locked period expires at ${moment
            .tz(date, 'Europe/Berlin')
            .format(module.exports.dateFormat)} UTC+1`;
    },

    errorMessage: (username, date) => {
        return `ERROR - task is already assigned to @${username} 🔒 Locked period expires at ${moment
            .tz(date, 'Europe/Berlin')
            .format(module.exports.dateFormat)} UTC+1`;
    },

    cannotAssignAgain: (commentCreator, date) => {
        return `ERROR - @${commentCreator}, your 🔒 Locked period expired at ${moment
            .tz(date, 'Europe/Berlin')
            .format(
                module.exports.dateFormat
            )} UTC+1. If you are close to finishing this issue, open PR to ensure nobody else grabs it!`;
    },

    errorMessagePR: (commentCreator, prOpened) => {
        return `ERROR - @${commentCreator}, PR #${prOpened} was already opened for this issue! Try grabbing another one!`;
    },

    successAssign: (commentCreator, bountyTime, date) => {
        return `ASSIGNED - @${commentCreator} has been assigned with this issue 🔒 Locked period expires in ${bountyTime} hours at ${moment
            .tz(date, 'Europe/Berlin')
            .format(module.exports.dateFormat)} UTC+1`;
    },
};
