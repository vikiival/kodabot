const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const moment = require('moment')
const variables = require("./variables");
module.exports = {
    checkDevAssignmentLimit: (devInfo) => {
        return devInfo.assigned.length >= 5;
    },

    checkDevUnfinished: (devInfo, issueNumber) => {
        return devInfo.unfinished.includes(issueNumber);

    },
    checkPrOpened: (storedIssue) => {
        return storedIssue.prOpened !== ''
    },
    checkAssignmentExpired: (storedIssue, now) => {
        console.log('checkAssignmentExpired', now > moment(storedIssue.lockedPeriod) && storedIssue.lockedPeriod !== '')
        return now > moment(storedIssue.lockedPeriod) && storedIssue.lockedPeriod !== ''
    },
    checkOptionAvailability: (storedIssue, commentCreator, now) => {
        console.log('checking Option availability', storedIssue.assignee, storedIssue.optionHolder, moment(storedIssue.optionPeriod))
        return storedIssue.assignee === '' && storedIssue.optionHolder === commentCreator && moment(storedIssue.optionPeriod) > now
    },

    checkOptionExpired: (storedIssue, now) => {
        return moment(storedIssue.optionPeriod) < now && storedIssue.optionPeriod !== ''
    },

    checkPayoutPhrases: (commentBody) => {
        return commentBody.includes(variables.payoutPhrase)
    },

    checkForIgnoredUsers: (commentCreator) => {
        return commentCreator in variables.ignoredUsers
    },

    checkForGoPhrases: (commentBody) => {
        return variables.goPhrases.includes(commentBody)
    },

    checkedQueuedDevs: (storedIssue) => {
        return storedIssue.queue.length > 0
    },

    checkNextInQueue: (storedIssue) => {
        return storedIssue.queue[0] === storedIssue.optionHolder
    },
    checkStoredIssueExists: (storedIssue) => {
        return storedIssue !== null
    },

    checkDevInfoExists: (devInfo) => {
        return devInfo.result !== null
    },

    checkEmptyIssue: (storedIssue) => {
        return storedIssue.assignee === '' && storedIssue.lockedPeriod === '' && storedIssue.optionHolder === '' && storedIssue.optionPeriod === '' && storedIssue.prOpened === '' && storedIssue.queue.length === 0
    },
    checkTempPullsFull: (tempPulls) => {
        return tempPulls.length >= 10
    }
}
