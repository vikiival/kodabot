const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const functions = require('../../../exported/functions.js');
const variables = require('../../../exported/variables.js');
const checks = require('../../../exported/checks.js');
const moment = require('moment');
const generalObject = functions.generalParams(0);
const now = moment()

const leaderboard = []
const sha = await functions.getSHALeaderboard()
let mdTable = variables.tableHeader
const allTheKeys = await functions.getAllKeys(process.env.CLDFLR_PULLS);
console.log('length', allTheKeys.length)
// console.log(allTheKeys);
for (let i = 0; i < allTheKeys.length; i++) {
    let onePull = allTheKeys[i];
    let storedPull = await functions.getStoredData(
        process.env.CLDFLR_PULLS,
        onePull
    );
    // console.log(storedPull)
    let leaderboardRecord = leaderboard.find(obj => {
        return obj.devLogin === storedPull.prAuthor
    })
    if (leaderboardRecord === undefined) {
        leaderboard.push(functions.generateLeaderboardRecord(storedPull))
    } else {
        functions.updateLeaderboardRecord(storedPull, leaderboardRecord)
    }
}
leaderboard.sort((a, b) => b.totalAmountReceivedUSD -a.totalAmountReceivedUSD)
console.log(leaderboard)
for (let i = 0; i < leaderboard.length; i++) {
    let oneRecord = leaderboard[i];
    mdTable += functions.generateMdRecord(oneRecord.devLogin, oneRecord)
}

console.log(mdTable)
await functions.updateLeaderboardGH(generalObject, mdTable, now, sha)

