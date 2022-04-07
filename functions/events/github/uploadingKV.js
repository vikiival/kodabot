const functions = require("../../../exported/functions");
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});


let jsonGet = JSON.parse(
    (
        await lib.http.request['@1.1.6']({
            method: 'GET',
            url: `https://api.jsonbin.io/v3/b/6243030bd96a510f028b7f0f`,
            headers: {
                'X-Master-key': process.env.JSONBIN_API,
            },
        })
    ).body.toString()
);
for (let i = 0; i < jsonGet.record.length; i++) {
    console.log(jsonGet.record[i])
    await functions.cfStoreLeaderboard(jsonGet.record[i], jsonGet.record[i].prNumber)
}

// CLOUDFLARE PUT
