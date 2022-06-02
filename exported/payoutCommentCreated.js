const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("./shared");
const payout = require("./payout");

module.exports = {

    payoutCommentCreated: async (payload) => {
        // const commentBody = payload.comment.body;
        const prNumber = payload.issue.number;
        console.log(`payoutCommentCreated: ${prNumber}`);

        // if (shared.checks.payoutPhrases(commentBody)) {
        //     let newPullRequest = await payout.getPullRequest(prNumber)
        //     if (shared.checks.prMerged(newPullRequest)) {
        //         console.log('PAYOUT AFTER PR MERGED, PR NUMBER: ', prNumber)
        //         let oldPullRequest = await shared.getDataCf(process.env.CLDFLR_PULLS, prNumber);
        //         if (!shared.checks.emptyPull(oldPullRequest)) {
        //             await payout.leaderboard.fixLeaderboard(await shared.getDataCf(process.env.CLDFLR_TABLES, 'leaderboard'), oldPullRequest, newPullRequest)
        //             await payout.burnRate.fixBurnRate(await shared.getDataCf(process.env.CLDFLR_TABLES, 'burnRate'), oldPullRequest, newPullRequest)
        //             await shared.storeDataCf(process.env.CLDFLR_PULLS, oldPullRequest.prNumber, newPullRequest)
        //         }
        //
        //         let devObject = shared.getDevObject(newPullRequest.prAuthor)
        //         if (shared.checks.isInFinishedStreak(devObject, prNumber)) {
        //             await shared.storeDataCf(process.env.CLDFLR_DEVS, newPullRequest.prAuthor, devObject);
        //             await payout.finishedStreak.fixFinishedStreak(devObject, prNumber, payout.getAmountUsdFromPullObject(newPullRequest))
        //         }
        //     }
        // }
    }

}
