const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const shared = require("../../../exported/shared");



//////////////////
///////////////// settings need to to be solved here

const allTheKeys = await shared.getAllKeys(settings.cfIssues);
if (allTheKeys.length > 0) {
    for (let i = 0; i < allTheKeys.length; i++) {
        let issueNumber = parseInt(allTheKeys[i]);
        let storedIssue = await shared.getDataCf(settings.cfIssues, issueNumber);
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (shared.checks.storedIssueTemp(storedIssue)) {
                console.log('deleting temp stored issue:', issueNumber)
                await shared.deleteDataCf(settings.cfIssues, issueNumber)
            }
        }
    }
}
const checkCounter = await shared.getDataCf(process.env.CF_COUNTERS, `${ghObject.owner}/${ghObject.repo}`);
if (checkCounter.length >= 10) {
    console.log('EXECUTING UPDATE')
}
