const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const functions = require('../../../exported/functions.js');
const checks = require('../../../exported/checks.js');

issueNumber = context.params.event.issue.number;


let storedIssue = await functions.getStoredDataAC(
    issueNumber
);

if (checks.checkStoredIssueExists(storedIssue)) {
    if (checks.checkPrOpened(storedIssue)) {
        console.log(`PR OPENED FOR ISSUE ${issueNumber}, rest handled in prClosed`)
    } else {
        await functions.deleteStoredDataAC(
            issueNumber
        );
        let devInfo = await functions.getDevInfo(process.env.CLDFLR_DEVS, storedIssue.assignee)
        console.log('devInfo', devInfo)
        if (checks.checkDevInfoExists(devInfo)) {
            await functions.devInfoUpdate(devInfo, storedIssue.assignee, issueNumber, false)
        }
    }
    storedIssue = await functions.getStoredDataAC(
        issueNumber
    );
    if (storedIssue === null) {
        console.log(`issue ${issueNumber} successfully deleted from KV database`);
    }
}
