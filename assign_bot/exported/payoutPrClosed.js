const lib = require('lib')({
    token: process.env.STDLIB_SECRET_TOKEN
});
const payout = require("./payout");
const shared = require("./shared");
const settings = require("./settings");


module.exports = {

    payoutPrClosed: async (context) => {
        let ghObject = {owner: context.params.repository.owner.login, repo: context.params.repository.name}
        const prNumber = context.params.pull_request.number;
        const prAuthor = context.params.pull_request.user.login;
        const prMerged = context.params.pull_request.merged;
        if (settings.ignoredUsers.includes(prAuthor)
        ) {
            console.log("Ignoring closing/merging PR from ignored user: " + prAuthor);
            return
        }
        console.log('PR NUMBER #', prNumber, ' is being closed!');
        let pullRequest = await payout.getPullRequest(prNumber, ghObject);
        const issueNumbers = payout.getLinkedIssues(pullRequest, ghObject);
        let devObject = await shared.getDevObject(prAuthor);

        for (let i = 0; i < issueNumbers.length; i++) {
            let issueNumber = issueNumbers[i];
            let storedIssue = await shared.getDataAc(issueNumber)
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
        }
    }
}
