const {payoutPrClosed} = require("../exported/payoutPrClosed");
const {payoutPrOpened} = require("../exported/assignPrOpened");
const {assignIssueUnassigned} = require("../exported/assignIssueUnassigned");
const {assignIssueClosed} = require("../exported/assignIssueClosed");
const {assignCommentCreated} = require("../exported/assignCommentCreated");
const {assignIssueAssigned} = require("../exported/assignIssueAssigned");
const shared = require("../exported/shared")
const webhook = `${context.http.headers['x-github-event']}_${context.params.action}`
const payload = context.params;
const ghObject = {owner: payload.repository.owner.login, repo: payload.repository.name}
const settingsCf = await shared.getSettings(ghObject);
if (settingsCf !== null) {
    console.log('SETTINGS LOADED')
    switch (webhook) {
        case 'issue_comment_created':
            await assignCommentCreated(payload, ghObject, settingsCf);
            await new Promise((r) => setTimeout(r, 2000));
            console.log('assignCommentCreated done');
            break;
        case 'issues_assigned':
            await assignIssueAssigned(payload, ghObject, settingsCf);
            await new Promise((r) => setTimeout(r, 2000));
            console.log('assignIssueAssigned done');
            break;
        case 'issues_unassigned':
            await assignIssueUnassigned(payload, ghObject, settingsCf);
            await new Promise((r) => setTimeout(r, 2000));
            console.log('assignIssueUnassigned done');
            break;
        case 'issues_closed':
            await assignIssueClosed(payload, ghObject, settingsCf);
            await new Promise((r) => setTimeout(r, 2000));
            console.log('assignIssueClosed done');
            break;
        case 'pull_request_opened':
            await payoutPrOpened(payload, ghObject, settingsCf);
            await new Promise((r) => setTimeout(r, 2000));
            console.log('payoutPrOpened done');
            break;
        case 'pull_request_closed':
            await payoutPrClosed(payload, ghObject, settingsCf);
            await new Promise((r) => setTimeout(r, 2000));
            console.log('payoutPrClosed done');
            break;
    }
} else {
    console.log(`ERROR - SETTINGS NOT FOUND FOR ${ghObject.owner}/${ghObject.repo}`)
}
