const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const functions = require('../../../exported/functions.js');
const variables = require('../../../exported/variables.js');
const checks = require('../../../exported/checks.js');
const moment = require('moment');
// let issueNumber = 1236
let now = moment()
// let issueStoring = storedFunctions.issueInfo('tester1', now, '', 'tester2', now.add(30, 'seconds'))
// let storingIssue = await storedFunctions.storeIssueAC(
// issueNumber,
// issueStoring
// );
// let storedIssue = await storedFunctions.getStoredDataAC(
// (154).toString()
// );
// console.log('now > moment(storedIssue.lockedPeriod)', now > moment(storedIssue.lockedPeriod))
// if (storedFunctions.checkAssignmentExpired(storedIssue, now)) {
// console.log('EXPIRED OPTION PERIOD', storedIssue)}
// console.log(
// 'storedIssue', storedIssue, typeof storedIssue
// )
// let result = await lib.utils.kv['@0.1.16'].tables.truncate({
// table: `petersopko`
// });
let tempPulls = await functions.getTempPullsAC()
console.log(tempPulls)
