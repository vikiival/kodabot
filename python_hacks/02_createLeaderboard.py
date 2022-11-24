import json
import arrow

newLeaderboard = []


def updateLeaderboard(pullRequest, newLeaderboard):
    alreadyInLeaderboard = False
    if len(newLeaderboard) == 0:
        leaderboardRecord = createLeaderboardRecord(pullRequest)
        newLeaderboard.append(leaderboardRecord)
        return newLeaderboard
    for leaderboardRecord in newLeaderboard:
        if pullRequest['prAuthor'] == leaderboardRecord['devLogin']:
            alreadyInLeaderboard = True
            leaderboardRecord = updateLeaderboardRecord(
                pullRequest, leaderboardRecord)
    if alreadyInLeaderboard == False:
        leaderboardRecord = createLeaderboardRecord(pullRequest)
        newLeaderboard.append(leaderboardRecord)
    return newLeaderboard


def updateLeaderboardRecord(pullRequest, leaderboardRecord):

    if (pullRequest['prState'] == 'MERGED'):
        if leaderboardRecord['lastMergedPrDate'] != None and pullRequest['prMergedDate'] != None:
            if arrow.get(pullRequest['prMergedDate']) > arrow.get(leaderboardRecord['lastMergedPrDate']):
                leaderboardRecord['lastMergedPrDate'] = pullRequest['prMergedDate']
        leaderboardRecord['mergedPrs'] += 1
        leaderboardRecord['linesAdded'] += pullRequest['linesAdded']
        leaderboardRecord['linesRemoved'] += pullRequest['linesRemoved']
        leaderboardRecord['numOfTotalCommitsMerged'] += pullRequest['commits']
    else:
        leaderboardRecord['closedPrs'] += 1
    leaderboardRecord['numberOfOpenPrs'] += 1
    leaderboardRecord['commentsCount'] += pullRequest['commentsCount']
    leaderboardRecord['numOfLinkedIssues'] += len(pullRequest['linkedIssues'])
    return leaderboardRecord


def createLeaderboardRecord(pullRequest):
    leaderboardRecord = {}
    leaderboardRecord['devLogin'] = pullRequest['prAuthor']
    leaderboardRecord['totalAmountReceivedUSD'] = 0
    leaderboardRecord['totalAmountReceivedKSM'] = 0
    leaderboardRecord['numberOfOpenPrs'] = 1
    leaderboardRecord['mergedPrs'] = 0
    leaderboardRecord['closedPrs'] = 0
    leaderboardRecord['linesAdded'] = pullRequest['linesAdded']
    leaderboardRecord['linesRemoved'] = pullRequest['linesRemoved']
    leaderboardRecord['numOfTotalCommitsMerged'] = pullRequest['commits']
    leaderboardRecord['linkToLastSubscan'] = ''
    leaderboardRecord['lastMergedPrDate'] = pullRequest['prMergedDate']
    leaderboardRecord['commentsCount'] = pullRequest['commentsCount']
    leaderboardRecord['numOfLinkedIssues'] = len(pullRequest['linkedIssues'])
    if pullRequest['prState'] == 'MERGED':
        leaderboardRecord['mergedPrs'] += 1
    else:
        leaderboardRecord['closedPrs'] += 1
    return leaderboardRecord

with open('result_01_pullDatabase.json', 'r') as pullDatabase:
    pullDatabase = json.load(pullDatabase)

for pullRequest in pullDatabase:
    newLeaderboard = updateLeaderboard(pullRequest, newLeaderboard)

newLeaderboard = sorted(
    newLeaderboard, key=lambda d: d['totalAmountReceivedUSD'], reverse=True)
with open('result_02_leaderboard.json', 'w') as outfile:
    json.dump(newLeaderboard, outfile)
    outfile.close()
