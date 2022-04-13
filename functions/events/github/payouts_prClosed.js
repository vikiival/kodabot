const lib = require('lib')({
    token: process.env.STDLIB_SECRET_TOKEN
});
const payout = require("../../../exported/payout");
const shared = require("../../../exported/shared");
const settings = require("../../../exported/settings");
const prNumber = context.params.event.pull_request.number;
const prAuthor = context.params.event.pull_request.user.login;
const prMerged = context.params.event.pull_request.merged;
if (settings.ignoredUsers.includes(prAuthor)) {
    return
}
let pullRequest = await payout.getPullRequest(prNumber)
const issueNumber = payout.getLinkedIssue(pullRequest);
let devObject = await shared.getDevObject(prAuthor);
let prPaid = await payout.getAmountUsdFromPullObject(pullRequest) > 0
let storedIssue = await shared.getDataAc(issueNumber)
let mergedAndPaid = await shared.getDataAc(settings.mergedAndPaid)
if (prMerged && prPaid) {
    if (mergedAndPaid === null) {
        mergedAndPaid = []
    }
    mergedAndPaid.push(prNumber)
    await shared.storeDataAc(settings.mergedAndPaid, mergedAndPaid)
}
await payout.updateLeaderboard(pullRequest, await shared.getDataCf(process.env.CLDFLR_TABLE, 'leaderboard'));
await payout.burnRate.updateBurnRate(pullRequest, await shared.getDataCf(process.env.CLDFLR_TABLE, 'burnRate'));

if (shared.checks.storedIssueExists(storedIssue)) {
    if (storedIssue.prOpened === prNumber) {
        storedIssue.prOpened = null
    }
    if (shared.checks.devObjectExists(devObject)) {
        await shared.updateDevObject(
            devObject,
            prAuthor,
            issueNumber,
            prMerged
        );
    }
    await shared.storeDataAc(issueNumber, storedIssue)
}

if (shared.checks.mergedAndPaidFull(mergedAndPaid)) {
    let leaderboardMD = await payout.makeLeaderboardMd(await shared.getDataCf(process.env.CLDFLR_TABLE, 'leaderboard'));
    let burnRateMD = await payout.burnRate.makeBurnRateMdTable(await shared.getDataCf(process.env.CLDFLR_TABLE, 'leaderboard'));
    await payout.pushTable(leaderboardMD, settings.leaderboardPath, settings.leaderboardFile, settings.leaderboardTitle);
    mergedAndPaid = []
    await shared.storeDataAc(settings.mergedAndPaid, mergedAndPaid)
}
await payout.recordFinishedStreak(
    storedIssue,
    devObject,
    issueNumber,
    prNumber,
    payout.getAmountUsdFromPullObject(pullRequest),
);
