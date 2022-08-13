const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const settings = require("../../../exported/settings");
const shared = require("../../../exported/shared");
let openAssignments = await shared.getAllDataAc();
if (openAssignments.length > 0) {
    for (let i = 0; i < openAssignments.length; i++) {
        if (settings.ignoredStorage.includes(openAssignments[i][0])) {
            continue;
        }
        let issueNumber = parseInt(openAssignments[i][0]);
        let storedIssue = openAssignments[i][1];
        if (shared.checks.storedIssueExists(storedIssue)) {
            if (shared.checks.storedIssueTemp(storedIssue)) {
                console.log('deleting temp stored issue:', issueNumber)
                await shared.deleteStoredDataAc(issueNumber)
            }
        }
    }
}
