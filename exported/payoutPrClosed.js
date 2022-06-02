const lib = require('lib')({
    token: process.env.STDLIB_SECRET_TOKEN
});
const payout = require("./payout");
const shared = require("./shared");

module.exports = {

    payoutPrClosed: async (payload, ghObject, settings) => {
        const prNumber = payload.pull_request.number;
        const prAuthor = payload.pull_request.user.login;
        const prMerged = payload.pull_request.merged;
        if (settings.ignoredUsers.includes(prAuthor)
        ) {
            console.log("Ignoring closing/merging PR from ignored user: " + prAuthor);
            return
        }

        if (prMerged) {
            await shared.updateCounter(ghObject, prNumber)
        }
        console.log('PR NUMBER #', prNumber, ' is being closed!');
        let pullRequest = await payout.getPullRequest(prNumber, ghObject);
        const issueNumbers = payout.getLinkedIssues(pullRequest, ghObject);
        let devObject = await shared.getDevObject(prAuthor, settings);

        for (let i = 0; i < issueNumbers.length; i++) {
            let issueNumber = issueNumbers[i];
            let storedIssue = await shared.getDataCf(settings.cfIssues, issueNumber)
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
                await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue)
            }
        }
    }
}
