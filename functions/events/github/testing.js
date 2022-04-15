const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const settings = require('../../../exported/settings.js');
const shared = require('../../../exported/shared');
const assign = require('../../../exported/assign');
const payout = require('../../../exported/payout');
const {storeDataCf, getDataCf} = require("../../../exported/shared");

// let result = await lib.utils.kv['@0.1.16'].entries();
let jsonBinBurnRate = await lib.http.request['@1.1.6'].get({
    url: `https://api.jsonbin.io/b/62559fd87b69e806cf4c737c/7`,
    headers: {
        'X-MASTER-KEY': `${process.env.JSONBIN_MASTER_KEY}`,
    },
});
let jsonBinLeaderboard = await lib.http.request['@1.1.6'].get({
    url: `https://api.jsonbin.io/b/62559fd87b69e806cf4c737c/7`,
    headers: {
        'X-MASTER-KEY': `${process.env.JSONBIN_MASTER_KEY}`,
    },
});
await storeDataCf(process.env.CLDFLR_TABLES, 'leaderboard', jsonBinLeaderboard.data);
await storeDataCf(process.env.CLDFLR_TABLES, 'burnRate', jsonBinBurnRate.data);
let burnRate = await getDataCf(process.env.CLDFLR_TABLES, 'burnRate');
let leaderboard = await getDataCf(process.env.CLDFLR_TABLES, 'leaderboard');

let burnRateMD = await payout.burnRate.makeBurnRateMdTable(burnRate)
let leaderboardMD = await payout.makeLeaderboardMd(leaderboard)
console.log(burnRateMD, leaderboardMD)
await payout.burnRate.updateTables(leaderboard, burnRate);


// let totalAmountUnfiltered = 0
// let totalAmount = 0;
// for (let i = 0; i < burnRate.length; i++) {
// if (burnRate[i].month !== undefined) {
// totalAmount += burnRate[i].amountPaid;
// }
// }

// for (let i = 0; i < result.data.length; i++) {
// totalAmountUnfiltered += result.data[i].amountPaid
// }
// console.log(totalAmount, totalAmountUnfiltered)
// let leaderboard = result.data.record
// await payout.storeLeaderboard(leaderboard)
// leaderboard = await payout.getLeaderboard()
// console.log('test leaderboard sample', leaderboard[0])

// console.log(await payout.makeLeaderboardMd(await payout.getLeaderboard()))
// console.log(await payout.getPullRequest(2808))\
// console.log(result)
// let burnRate = await payout.burnRate.updateBurnRate(await payout.getPullRequest(679), await shared.getDataCf(process.env.CLDFLR_TABLES, 'burnRate'));
// let burnRateMd = payout.burnRate.makeBurnRateMdTable(burnRate)
