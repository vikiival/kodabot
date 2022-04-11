const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("../../../exported/shared");
const payout = require("../../../exported/payout");

// upload leaderboard to Cloudflare
let result = await lib.http.request['@1.1.6'].get({
    url: `https://api.jsonbin.io/v3/b/62543dacd8a4cc06909f142c`,
    headers: {
        'X-ACCESS-KEY': `${process.env.JSONBIN_ACCESS_KEY}`
    }
});
let leaderboard = result.data.record
await payout.storeLeaderboard(leaderboard)
leaderboard = await payout.getLeaderboard()
console.log('test leaderboard sample', leaderboard[0])

// upload mergedAndPaid array to autocode
await shared.storeDataAc('mergeAndPaid', [])   // empty array
