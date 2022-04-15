const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("../../../exported/shared");
const payout = require("../../../exported/payout");
const commentBody = context.params.event.comment.body;
const prNumber = context.params.event.issue.number;


if (shared.checks.payoutPhrases(commentBody)) {
    let newPullRequest = await payout.getPullRequest(prNumber)
    if (shared.checks.prMerged(newPullRequest)) {
        let oldPullRequest = await shared.getDataCf(process.env.CLDFLR_PULLS, prNumber);
        if (!shared.checks.emptyPull(oldPullRequest)) {
            await payout.leaderboard.fixLeaderboard(await shared.getDataCf(process.env.CLDFLR_TABLES, 'leaderboard'), oldPullRequest, newPullRequest)
            await payout.burnRate.fixBurnRate(await shared.getDataCf(process.env.CLDFLR_TABLES, 'burnRate'), oldPullRequest, newPullRequest)
            await shared.storeDataCf(process.env.CLDFLR_PULLS, oldPullRequest.prNumber, newPullRequest)
        }

        let devObject = shared.getDevObject(newPullRequest.prAuthor)
        if (shared.checks.isInFinishedStreak(devObject, prNumber)) {
            await shared.storeDataCf(process.env.CLDFLR_DEVS, newPullRequest.prAuthor, devObject);
            await payout.finishedStreak.fixFinishedStreak(devObject, prNumber, payout.getAmountUsdFromPullObject(newPullRequest))
        }
    }
}
