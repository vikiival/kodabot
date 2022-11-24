import json
import arrow


def getMonth(date):
    return f'{arrow.get(date).month}'


def getWeek(date):
    return f'{arrow.get(date).week}'


def updateBurnRateDaily(pullRequest, burnRate):
    alreadyInBurnRate = False
    if len(burnRate) == 0:
        burnRateRecord = createRecordDaily(pullRequest)
        burnRate.append(burnRateRecord)
        return burnRate
    for burnRateRecord in burnRate:
        if arrow.get(pullRequest['prMergedDate']) == arrow.get(burnRateRecord['date']):
            alreadyInBurnRate = True
            burnRateRecord = updateRecordDaily(burnRateRecord, pullRequest)
    if alreadyInBurnRate == False:
        burnRateRecord = createRecordDaily(pullRequest)
        burnRate.append(burnRateRecord)
    return burnRate


def createRecordDaily(pullRequest):
    burnWeek = int(getWeek(pullRequest['prMergedDate']))
    burnMonth = int(getMonth(pullRequest['prMergedDate']))
    burnDate = pullRequest['prMergedDate']
    burnObject = {}
    burnObject['date'] = burnDate
    burnObject['month'] = burnMonth
    burnObject['week'] = burnWeek
    burnObject['numberOfTransactions'] = 0
    burnObject['amountPaid'] = 0
    burnObject['numberOfPaidIssues'] = len(pullRequest['linkedIssues'])
    burnObject['numberOfPeopleInvolved'] = 1
    burnObject['avgPaidPr'] = 0
    burnObject['peopleInvolved'] = [pullRequest['prAuthor']]
    return burnObject


def updateRecordDaily(burnObject, pullRequest):
    burnObject['numberOfPaidIssues'] += len(pullRequest['linkedIssues'])
    if pullRequest['prAuthor'] not in burnObject['peopleInvolved']:
        burnObject['peopleInvolved'].append(pullRequest['prAuthor'])
    burnObject['numberOfPeopleInvolved'] = len(burnObject['peopleInvolved'])
    burnObject['amountPaid'] = 0
    return burnObject


with open('result_01_pullDatabase.json', 'r') as pullDatabase:
    pullDatabase = json.load(pullDatabase)

burnRate = []
for pullRequest in pullDatabase:
    print(pullRequest['prNumber'])
    if pullRequest['prMergedDate'] != None and arrow.get(pullRequest['prMergedDate']) > arrow.get('2021-11'):
        burnRate = updateBurnRateDaily(pullRequest, burnRate)

weeks = []
months = []
for burnRateDay in burnRate:
    monthAlreadyIn = False
    weekAlreadyIn = False
    for month in months:
        if burnRateDay['month'] == month['month'] and arrow.get(month['date']).ceil('month') == arrow.get(burnRateDay['date']).ceil('month'):
            monthAlreadyIn = True
            month['amountPaid'] = 0
            month['numberOfPaidIssues'] += burnRateDay['numberOfPaidIssues']
            if burnRateDay['peopleInvolved'][0] not in month['peopleInvolved']:
                month['peopleInvolved'].append(
                    burnRateDay['peopleInvolved'][0])
            month['numberOfPeopleInvolved'] = len(month['peopleInvolved'])
            month['amountPaid'] = 0
    for week in weeks:
        if burnRateDay['week'] == week['week'] and arrow.get(week['date']).ceil('week') == arrow.get(burnRateDay['date']).ceil('week'):
            weekAlreadyIn = True
            week['amountPaid'] = 0
            week['numberOfPaidIssues'] += burnRateDay['numberOfPaidIssues']
            if burnRateDay['peopleInvolved'][0] not in week['peopleInvolved']:
                week['peopleInvolved'].append(burnRateDay['peopleInvolved'][0])
            week['numberOfPeopleInvolved'] = len(week['peopleInvolved'])
            week['amountPaid'] = 0

    if monthAlreadyIn == False:
        burnMonth = int(getMonth(burnRateDay['date']))
        burnDate = str(arrow.get(burnRateDay['date']).ceil('month'))
        burnObject = {}
        burnObject['date'] = burnDate
        burnObject['month'] = burnMonth
        burnObject['numberOfTransactions'] = 0
        burnObject['amountPaid'] = 0
        burnObject['numberOfPaidIssues'] = burnRateDay['numberOfPaidIssues']
        burnObject['numberOfPeopleInvolved'] = 1
        burnObject['avgPaidPr'] = 0
        burnObject['peopleInvolved'] = [burnRateDay['peopleInvolved'][0]]
        months.append(burnObject)
    if weekAlreadyIn == False:
        burnWeek = int(getWeek(burnRateDay['date']))
        burnDate = str(arrow.get(burnRateDay['date']).ceil('week'))
        burnObject = {}
        burnObject['date'] = burnDate
        burnObject['week'] = burnWeek
        burnObject['numberOfTransactions'] = 0
        burnObject['amountPaid'] = 0
        burnObject['numberOfPaidIssues'] = burnRateDay['numberOfPaidIssues']
        burnObject['numberOfPeopleInvolved'] = 1
        burnObject['avgPaidPr'] = 0
        burnObject['peopleInvolved'] = [burnRateDay['peopleInvolved'][0]]
        weeks.append(burnObject)

sortedBurnRate = weeks + months
sortedBurnRate = sorted(
    sortedBurnRate, key=lambda i: arrow.get(i['date']), reverse=True)


with open('result_03_burnRate.json', 'w') as outfile3:
    json.dump(sortedBurnRate, outfile3)
    outfile3.close()
