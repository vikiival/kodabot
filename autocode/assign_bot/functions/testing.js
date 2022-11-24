const {storeDataCf, getDataCf} = require("../exported/shared");
const payout = require("../exported/payout");
const assign = require("../exported/assign");
const shared = require("../exported/shared");
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});


// let result = await lib.utils.kv['@0.1.16'].clear({
// key: `85`
// });
// let storedIssue = await shared.getDataAc('821')
// console.log(storedIssue)


// let allEntries = await lib.utils.kv['@0.1.16'].entries();
// for (let i = 0; i < allEntries.length; i++){
// let issueNumber = allEntries[i][0];
// let storedIssue = allEntries[i][1]
// storedIssue.owner = 'kodadot'k
// storedIssue.repo = 'nft-gallery'
// await shared.storeDataAc(issueNumber, storedIssue)
// }
let allEntries = await lib.utils.kv['@0.1.16'].entries();
console.log(allEntries)
// let JarsenFix = await shared.getDataCf('e17e17399d824f6594fa420afeffd0b0', 'prachi00')
// let JarsenAssigned = JarsenFix.assigned
// let JarsenAssignedNew = [ 3401, 3207, 3492, 3501 ]
// JarsenFix.assigned = JarsenAssignedNew
// await shared.storeDataCf('e17e17399d824f6594fa420afeffd0b0', 'prachi00', JarsenFix)
// console.log(await shared.getDataCf('e17e17399d824f6594fa420afeffd0b0', 'prachi00'))

// console.log('assign', await assign.isVerifiedContributor('roiLeo'))
// // console.log (await assign.getAssignees(2605, shared.queries.getAssignees))
// let devObject = await shared.getDevObject('petersopko');
// console.log(allEntries)
//
// let jsonBinBurnRate = await lib.http.request['@1.1.6'].get({
// url: `https://api.jsonbin.io/b/62559fd87b69e806cf4c737c/13`,
// headers: {
// 'X-MASTER-KEY': `${process.env.JSONBIN_MASTER_KEY}`,
// },
// });
// let jsonBinLeaderboard = await lib.http.request['@1.1.6'].get({
// url: `https://api.jsonbin.io/b/6257f795bc312b30ebe75270/5`,
// headers: {
// 'X-MASTER-KEY': `${process.env.JSONBIN_MASTER_KEY}`,
// },
// });

// await storeDataCf(process.env.CLDFLR_TABLES, 'leaderboard', jsonBinLeaderboard.data);
// await storeDataCf(process.env.CLDFLR_TABLES, 'burnRate', jsonBinBurnRate.data);
// let burnRate = await getDataCf(process.env.CLDFLR_TABLES, 'burnRate');
// let leaderboard = await getDataCf(process.env.CLDFLR_TABLES, 'leaderboard');

// let burnRateMD = await payout.burnRate.makeBurnRateMdTable(burnRate)
// let leaderboardMD = await payout.leaderboard.makeLeaderboardMd(leaderboard)
// console.log(burnRateMD, leaderboardMD)

// await payout.updateTables(leaderboardMD, burnRateMD);
//
// let result1 = await lib.utils.kv['@0.1.16'].tables.truncate({
//     table: 'petersopko' // required
// });


// async function getShaKey(gitPath){
// console.log(shared.queries.getLeaderboardKey)
// const queryResult = await graphql(shared.queries.getLeaderboardKey,
// {
// repo: process.env.GITHUB_REPO,
// owner: process.env.GITHUB_OWNER,
// gitPath: gitPath,
// headers: {
// authorization: `token ${process.env.GITHUB_PERSONAL_KEY}`,
// },
// }
// );
// return queryResult.repository.object.oid;
// }
// console.log(await getShaKey(settings.leaderboardPath))
// console.log(settings.leaderboardPath)
// console.log(`${shared.queries.getLeaderboardKey}`)
//
// let result = await lib.utils.kv['@0.1.16'].entries();
//


// await assign.assignIssue(2880, 'petersopko')
// await shared.createComment(2880, 'test')
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
// let burnRate = await payout.burnRate.updateBurnRate(await payout.getPullRequest(679), await shared.getDataCf(process.env.CLDFLR_TABLES, 'burnRate'));
// let burnRateMd = payout.burnRate.makeBurnRateMdTable(burnRate)
