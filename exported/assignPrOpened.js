const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("./shared");
const payout = require("./payout");
const comments = require("./comments");


module.exports = {
    payoutPrOpened: async (payload, ghObject, settings) => {
        const prNumber = payload.pull_request.number;
        const prAuthor = payload.pull_request.user.login;
        if (shared.checks.ignoredUsers(prAuthor, settings)
        ) {
            console.log("Ignoring PR opened by ignored user: " + prAuthor);
            return
        }
        const issueNumbers = payout.getLinkedIssues(await payout.getPullRequest(prNumber, ghObject));
        for (let i = 0; i < issueNumbers.length; i++){
            let issueNumber = issueNumbers[i];
            let storedIssue = await shared.getDataCf(settings.cfIssues, issueNumber);
            if (shared.checks.isIssueIgnored(storedIssue)) {
                console.log("Ignoring PR opened on ignored issue: " + issueNumber);
                return
            }
            console.log('PR opened: ' + prNumber, 'PR author: ', prAuthor, 'Issue: ', issueNumber);
            if (shared.checks.linkedIssueNumber(issueNumber)) {
                if (shared.checks.prAuthorIsAssigned(storedIssue, prAuthor)) {
                    storedIssue.prOpened = prNumber;
                    await shared.storeDataCf(settings.cfIssues, issueNumber, storedIssue);
                    await shared.createComment(prNumber, comments.successPr(prAuthor, issueNumber), ghObject);
                } else {
                    await shared.createComment(prNumber, comments.warningPr(prAuthor, issueNumber), ghObject);
                }
            }
        }

    }
}
