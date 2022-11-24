const pullRequests = require("../../../exported/pullRequests")
const {graphql} = require('@octokit/graphql');
const settings = require('../../../exported/settings');
const shared = require("../../../exported/shared");

ghObject = {repo: "nft-gallery", owner: "kodadot"}
// ghObjectTest = {repo: "kodabot", owner: "petersopko"}


const leaderboard = await shared.getDataCf(process.env.CLDFLR_TABLES, 'leaderboard')
const burnRate = await shared.getDataCf(process.env.CLDFLR_TABLES, 'burnRate')
const burnRateMd = await pullRequests.burnRate.makeBurnRateMdTable(burnRate)
const leaderboardMd = await pullRequests.leaderboard.makeLeaderboardMd(leaderboard, ghObject)
console.log(leaderboardMd)
console.log(burnRateMd)

// await pullRequests.updateTables(leaderboardMd, burnRateMd, ghObject)
