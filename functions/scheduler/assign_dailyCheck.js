const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const settings = require("../../../exported/settings");
const shared = require("../../../exported/shared");
let allTheKeys = await shared.getAllKeys(process.env.CLDFLR_ISSUES);
if (allTheKeys.length > 0) {
    for (let i = 0; i < allTheKeys.length; i++) {
        let issueNumber = parseInt(allTheKeys[i][0]);
        let storedIssue = await shared.getDataCf(process.env.CLDFLR_ISSUES, issueNumber);
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (shared.checks.storedIssueTemp(storedIssue)) {
                console.log('deleting temp stored issue:', issueNumber)
                await shared.deleteDataCf(process.env.CLDFLR_ISSUES, issueNumber)
            }
        }
    }
}
