const lib = require('lib')({
    token: process.env.STDLIB_SECRET_TOKEN,
});
const {graphql} = require('@octokit/graphql');
const shared = require("./shared");
const moment = require('moment');
const bounties = ['$', '$$', '$$$', '$$$$', '$$$$$'];
const priorities = ['p1', 'p2', 'p3', 'p4', 'p5'];
module.exports = {
    makeObject: (edge) => {
        let bounty = null;
        let priority = null;
        for (let i = 0; i < edge.node.labels.nodes.length; i++) {
            if (bounties.includes(edge.node.labels.nodes[i].name)) {
                if (bounty === null) {
                    bounty = edge.node.labels.nodes[i].name;
                } else if (bounty.length < edge.node.labels.nodes[i].length) {
                    bounty = edge.node.labels.nodes[i].name;
                }
            }
            if (priorities.includes(edge.node.labels.nodes[i].name)) {
                priority = edge.node.labels.nodes[i].name;
            }
        }
        return {
            number: edge.node.number,
            closedAt: edge.node.closedAt,
            createdAt: edge.node.createdAt,
            bounty,
            priority,
            cursor: edge.cursor,
        };
    },
    getFirstIssues: async (ghObject) => {
        const queryResult = await graphql(
            `
        query getAllClosedIssues($name: String!, $owner: String!) {
          repository(name: $name, owner: $owner) {
            issues(states: CLOSED, first: 100) {
              totalCount
              edges {
                cursor
                node {
                  number
                  closedAt
                  createdAt
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `,
            {
                name: ghObject.repo,
                owner: ghObject.owner,
                headers: {
                    authorization: `token ${process.env.GITHUB_PERSONAL_KEY}`,
                },
            }
        );
        return queryResult.repository.issues.edges.map((edge) =>
            module.exports.makeObject(edge)
        );
    },
    getNextIssues: async (cursor, ghObject) => {
        const queryResult = await graphql(
            `
        query getAllClosedIssues2($name: String!, $owner: String!, $after: String!) {
          repository(name: $name, owner: $owner) {
            issues(states: CLOSED, first: 100, after: $after) {
              totalCount
              edges {
                cursor
                node {
                  number
                  closedAt
                  createdAt
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
          }
        }
        `,
            {
                name: ghObject.repo,
                owner: ghObject.owner,
                after: cursor,
                headers: {
                    authorization: `token ${process.env.GITHUB_PERSONAL_KEY}`,
                },
            }
        );
        return queryResult.repository.issues.edges.map((edge) =>
            module.exports.makeObject(edge)
        );
    },
    getAllTheIssuesNow: async () => {
        let cursor;
        let allTheObjects = await module.exports.getFirstIssues();
        for (let i = 0; i < allTheObjects.length; i++) {
            if (i === allTheObjects.length - 1 && allTheObjects[i].cursor !== cursor) {
                cursor = allTheObjects[i].cursor;
                console.log(allTheObjects[i].cursor);
                allTheObjects = allTheObjects.concat(await module.exports.getNextIssues(cursor));
                console.log(allTheObjects.length);
            }
        }
        allTheObjects.sort(
            (a, b) => moment(b.closedAt) - moment(a.closedAt)
        );
        return allTheObjects;
    },
    createIssueRecord: (issue, period) => {

        let issueObject = {}
        if (period === 'week') {
            issueObject.week = parseInt(moment(issue.closedAt).format('w'))
            issueObject.date = moment(issue.closedAt).endOf('week').format('YYYY-MM-DD hh:mm');
            if (issueObject.week !== parseInt(moment(issueObject.date).format('w'))){
                console.log('week error', issueObject.week, parseInt(moment(issueObject.date).format('w')))
            }
        }
        if (period === 'month') {
            issueObject.month = parseInt(moment(issue.closedAt).format('M'))
            issueObject.date = moment(issue.closedAt).endOf('month').format('YYYY-MM-DD hh:mm');
        }
        issueObject.age = [moment(issue.closedAt).diff(moment(issue.createdAt), 'days', true)]
        if (issue.bounty){
            issueObject.bounties = [issue.bounty]
        } else {
            issueObject.bounties = []
        }
        if (issue.priority){
            issueObject.priorities = [issue.priority]
        } else {
            issueObject.priorities = []
        }
        issueObject.numberOfIssues = 1;
        return issueObject
    },
    updateIssueRecord: (issueObject, issue) => {
        issueObject.numberOfIssues += 1
        issueObject.age.push(moment(issue.closedAt).diff(moment(issue.createdAt), 'days', true))
        if (issue.bounty !== null) {
            issueObject.bounties.push(issue.bounty)
        }
        if (issue.priority !== null) {
            issueObject.priorities.push(issue.priority)
        }
        return issueObject
    },
    updateIssuesReport: (issuesArray, issuesReport) => {
        for (let i = 0; i < issuesArray.length; i++) {
            let issue = issuesArray[i]
            let issueWeekObject = issuesReport.find(issueObject => parseInt(issueObject.week) === parseInt(moment(issue.closedAt).format('w')) && parseInt(moment(issueObject.date).endOf('week').format('YYYY')) === parseInt(moment(issue.closedAt).endOf('week').format('YYYY')))
            let issueMonthObject = issuesReport.find(issueObject => parseInt(issueObject.month) === parseInt(moment(issue.closedAt).format('M')) && parseInt(moment(issueObject.date).endOf('month').format('YYYY')) === parseInt(moment(issue.closedAt).endOf('month').format('YYYY')))
            if (issueWeekObject) {
                issueWeekObject = module.exports.updateIssueRecord(issueWeekObject, issue)
            } else {
                console.log('not in table', parseInt(moment(issue.closedAt).format('w')), parseInt(moment(issue.closedAt).format('YYYY')))
                issuesReport.push(module.exports.createIssueRecord(issue, 'week'))
            }
            if (issueMonthObject) {
                issueMonthObject = module.exports.updateIssueRecord(issueMonthObject, issue)
            } else {
                console.log('not in table', parseInt(moment(issue.closedAt).format('M')), parseInt(moment(issue.closedAt).format('YYYY')))
                issuesReport.push(module.exports.createIssueRecord(issue, 'month'))
            }
        }
        issuesReport.sort(
            (a, b) => moment(b.date) - moment(a.date)
        );
        return issuesReport
    },
    makeIssueReportMd: (issuesReport, issuesArray) => {
        let mdTable = module.exports.issueReportHeaderMd
        for (let i = 0; i < issuesReport.length; i++) {
            mdTable += module.exports.makeIssueRecordMd(issuesReport[i])
        }
        mdTable += module.exports.issueReportFooterMd(issuesArray)
        return mdTable
    },
    makeIssueRecordMd: (record) => {

        let totalAge = record.age.reduce((a, b) => a + b, 0)
        // let avgAge = ((totalAge / record.age.length) || 0).toFixed(2)
        // let totalAgeDeviation = record.age.reduce((a, b) => a + Math.pow(b - avgAge, 2), 0)
        // let ageDeviation = Math.sqrt(totalAgeDeviation / record.age.length).toFixed(2)

        let age1Week = (record.age.filter(age => age < 7).length / record.numberOfIssues * 100).toFixed(2)

        let age1Month = (record.age.filter(age => age < 30).length / record.numberOfIssues * 100).toFixed(2)


        let totalBounties = record.bounties.reduce((a, b) => a + b.length, 0)
        let avgBounties = ((totalBounties / record.bounties.length) || 0).toFixed(2)


        let totalPriorities = record.priorities.reduce((a, b) => a + parseInt(b[1]), 0)
        let avgPriorities = ((totalPriorities / record.priorities.length) || 0).toFixed(2)


        if (record.month !== undefined) {
            return `| :date: ***${`${moment(record.date).format('MMMM')} ${moment(record.date).year()}`}*** | ***${record.numberOfIssues}*** | ***${age1Week}%*** | ***${age1Month}%*** | ***${avgBounties}*** | ***${avgPriorities}*** |\n`
        } else {
            return `| Week ${record.week}/${moment(record.date).format('YY')} | ${record.numberOfIssues} | ${age1Week}% | ${age1Month}% | ${avgBounties} | ${avgPriorities} |\n`
        }
    },
    issueReportHeaderMd: `<div align="center">  \n \n | date | # of issues | % of issues where <br/> age < 7 days | % of issues where <br/> age < 30 days | avg # of <br/> $ (bounties) | avg priority |
|:-----------------:|:-----------------:|:-----------------:|:-----------------:|:-----------------------:|:----------------------:| \n`,
    issueReportFooterMd: (issuesArray, totalPeopleInvolved) => {
        return `\n \n **ISSUE REPORT GENERATED BASED ON ${issuesArray.length} CLOSED ISSUES, AT ${moment().format('MMM Do YYYY')}** \n \n </div>`
    },
};
