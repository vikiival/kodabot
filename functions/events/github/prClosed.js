const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const functions = require('../../../exported/functions.js');
const variables = require('../../../exported/variables.js');
const checks = require("../../../exported/checks");
const moment = require('moment');

const prBody = context.params.event.pull_request.body
const prNumber = context.params.event.pull_request.number;
const prAuthor = context.params.event.pull_request.user.login;
const prMerged = context.params.event.pull_request.merged

if (variables.ignoredUsers.includes(prAuthor)) {
    return
}
let issueNumber = parseInt(variables.prClosingIssue(prBody).toString().trim())
let generalObject = functions.generalParams(prNumber);
let now = moment()
// get storedIssue object from temp. storage
let storedIssue = await functions.getStoredDataAC(
    issueNumber
);
console.log('storedIssue', storedIssue)
// get tempPulls object from temp. storage
let tempPulls = await functions.getTempPullsAC()
console.log('tempPulls', tempPulls)
let unpaidPulls = await functions.getUnpaidPullsAC()
console.log('unpaidPulls', unpaidPulls)
// if unpaidPulls KV is empty, create new empty array
if (unpaidPulls === null) {
    unpaidPulls = []
}
// if tempPulls KV is empty, create new empty array
if (tempPulls === null) {
    tempPulls = []
}
// if PR was merged
if (prMerged) {
    // get dev data
    let devInfo = await functions.getDevInfo(process.env.CLDFLR_DEVS, prAuthor)
    if (checks.checkDevInfoExists(devInfo)) {
        // if dev info exists, update (move issue from assigned to finished)
        await functions.devInfoUpdate(devInfo, prAuthor, issueNumber, prMerged)
    }
    // delete storedIssue from temp. storage
    await functions.deleteStoredDataAC(
        issueNumber
    );
    // if this pull is not in temp storage, add it to the end
    if (!tempPulls.includes(prNumber)) {
        tempPulls.push(prNumber)
    }
    // check if temp pulls are full (more than 10) and if yes
    if (checks.checkTempPullsFull(tempPulls)) {
        // look for payout data
        for (let i = 0; i < tempPulls.length; i++) {
            let onePull = tempPulls[i]
            console.log('onePull', onePull)
            let storedPull = await functions.getStoredData(
                process.env.CLDFLR_PULLS,
                onePull
            );
            console.log('storedPull.result', storedPull.result)
            // if there's no payout data about merged PR, store it in unpaidPulls
            if (storedPull.result === null) {
                unpaidPulls.push(onePull)
            }
        }
        // delete unpaid PR from tempPulls
        for (let i = 0; i < unpaidPulls.length; i++) {
            for (let i2 = 0; i2 < tempPulls.length; i2++) {
                if (unpaidPulls[i] === tempPulls[i2]) {
                    tempPulls.splice(i2, 1);
                }
            }
        }
        // if tempPulls is > 10, update leaderboard
        if (checks.checkTempPullsFull(tempPulls)) {
            // generate empty array for leaderboard
            let leaderboard = await functions.getLeaderboard()
            console.log('leaderboard', leaderboard)
            const sha = await functions.getSHALeaderboard()
            console.log('sha', sha)
            leaderboard = await functions.updateLeaderboard(tempPulls, leaderboard)
            console.log('updatedLeaderboard', leaderboard)
            let mdTable = functions.generateMdTable(leaderboard)
            console.log('mdTable', mdTable)
            await functions.updateLeaderboardGH(generalObject, mdTable, now, sha)
            await functions.storeUnpaidPullsAC(unpaidPulls)
            await functions.storeTempPullsAC([])
        }
    }
} else {
    storedIssue.prOpened = ''
    await functions.storeIssueAC(issueNumber, storedIssue);
}

