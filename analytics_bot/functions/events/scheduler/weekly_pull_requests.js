const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("../../../exported/shared");
const pullRequests = require("../../../exported/pullRequests")
const {graphql} = require('@octokit/graphql');

const githubPullRequests = await pullRequests.getAllPullRequestNumbers()
for (let i = 0; i < githubPullRequests.length; i++) {
    const newPullObject = await pullRequests.getPullRequest(githubPullRequests[i])
    console.log('PR NUMBER #', githubPullRequests[i], ' is being uploaded to Cloudflare!');
    await shared.storeDataCf(process.env.CLDFLR_PULLS, githubPullRequests[i], newPullObject)
}
