const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("../../../exported/shared");
const payout = require("../../../exported/payout");
const commentBody = context.params.event.comment.body;
const prNumber = context.params.event.issue.number;

// this whole file is basically here to handle one edge case => PR was merged as one of the 10 PRs that get into leaderboard,
// and after that, PR receives payment.
// This file fixes the saved pullRequest, dev FinishedStreak (if it's still in progress) and fixes the leaderboard.

if (shared.checks.payoutPhrases(commentBody)) {
    let newPullRequest = await payout.getPullRequest(prNumber)
    if (shared.checks.prMerged(newPullRequest)) {
        let pullRequest = await shared.getDataCf(process.env.CLDFLR_PULLS, prNumber);
        if (!shared.checks.emptyPull(pullRequest)) {
            if (shared.checks.addedToLeaderboard(pullRequest)) {
                await payout.fixLeaderboard(await payout.getDataCf(process.env.CLDFLR_TABLE, 'leaderboard'), pullRequest)
            } else {
                await shared.storeDataCf(process.env.CLDFLR_PULLS, pullRequest.prNumber, newPullRequest)
            }
        }
        let devObject = shared.getDevObject(newPullRequest.prAuthor)
        if (shared.checks.isInFinishedStreak(devObject, prNumber)) {
            await shared.storeDataCf(process.env.CLDFLR_DEVS, newPullRequest.prAuthor, devObject);
            await payout.fixFinishedStreak(devObject, prNumber, payout.getAmountUsdFromPullObject(newPullRequest))
        }
    }
}
