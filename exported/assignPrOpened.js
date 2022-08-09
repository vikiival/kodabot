const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("./shared");
const payout = require("./payout");
const settings = require("./settings");


module.exports = {
    payoutPrOpened: async (context) => {
        let ghObject= {owner: context.params.repository.owner.login, repo: context.params.repository.name}
        const prNumber = context.params.pull_request.number;
        const prAuthor = context.params.pull_request.user.login;
        if (shared.checks.ignoredUsers(prAuthor)
        ) {
            console.log("Ignoring PR opened by ignored user: " + prAuthor);
            return
        }
        const issueNumbers = payout.getLinkedIssues(await payout.getPullRequest(prNumber, ghObject));
        for (let i = 0; i < issueNumbers.length; i++){
            let issueNumber = issueNumbers[i];
            let storedIssue = await shared.getDataAc(issueNumber);
            if (shared.checks.isIssueIgnored(storedIssue)) {
                console.log("Ignoring PR opened on ignored issue: " + issueNumber);
                return
            }
            console.log('PR opened: ' + prNumber, 'PR author: ', prAuthor, 'Issue: ', issueNumber);
            if (shared.checks.linkedIssueNumber(issueNumber)) {
                if (shared.checks.prAuthorIsAssigned(storedIssue, prAuthor)) {
                    storedIssue.prOpened = prNumber;
                    await shared.storeDataAc(issueNumber, storedIssue);
                    await shared.createComment(prNumber, settings.comments.successPr(prAuthor, issueNumber), ghObject);
                } else {
                    await shared.createComment(prNumber, settings.comments.warningPr(prAuthor, issueNumber), ghObject);
                }
            }
        }

    }
}
