import json
import arrow

skippingList = ['yangwao', 'vikiival', 'roiLeo']

# LEADERBOARD

with open('result_05_transactionsList.json', 'r') as transactionsList:
    transactions = json.load(transactionsList)
    transactionsList.close()

with open('result_02_leaderboard.json', 'r') as newLeaderboard:
    leaderboard = json.load(newLeaderboard)
    newLeaderboard.close()


for record in leaderboard:
    record['totalAmountReceivedKSM'] = 0
    record['totalAmountReceivedUSD'] = 0
    for transaction in transactions:
        if (transaction['dev'] in skippingList):
            continue
        if record['devLogin'] == transaction['dev']:
            if transaction['dev'] in skippingList or transaction['totalUsd'] > 2900 or transaction['totalUsd'] < 10:
                continue
            record['totalAmountReceivedKSM'] += transaction['totalKsm']
            record['totalAmountReceivedUSD'] += transaction['totalUsd']
            if 'lastTransactionDate' not in record:
                record['lastTransactionDate'] = transaction['date']
            if arrow.get(transaction['date']) >= arrow.get(record['lastTransactionDate']):
                record['lastTransactionDate'] = transaction['date']
                record['linkToLastSubscan'] = transaction['link']
    record['totalAmountReceivedKSM'] = round(
        record['totalAmountReceivedKSM'], 3)
    record['totalAmountReceivedUSD'] = round(
        record['totalAmountReceivedUSD'], 2)

with open('result_02_leaderboard.json', 'w') as newLeaderboard:
    leaderboard = sorted(
        leaderboard, key=lambda i: i['totalAmountReceivedUSD'], reverse=True)
    json.dump(leaderboard, newLeaderboard)
    newLeaderboard.close()

# BURN RATE

with open('result_05_transactionsList.json', 'r') as transactionsList:
    transactions = json.load(transactionsList)
    transactionsList.close()

with open('result_03_burnRate.json', 'r') as sortedBurnRate:
    burnRate = json.load(sortedBurnRate)
    sortedBurnRate.close()

for record in burnRate:
    record['amountPaid'] = 0
    record['numberOfTransactions'] = 0
    for transaction in transactions:
        if transaction['dev'] in skippingList or transaction['totalUsd'] > 2900 or transaction['totalUsd'] < 10:
            continue
        if 'month' in record:
            if arrow.get(transaction['block_timestamp']).month == record['month'] and arrow.get(transaction['block_timestamp']).year == arrow.get(record['date']).year:
                record['amountPaid'] += transaction['totalUsd']
                record['numberOfTransactions'] += 1
        if 'week' in record:
            if arrow.get(transaction['block_timestamp']).week == record['week'] and arrow.get(transaction['block_timestamp']).year == arrow.get(record['date']).year:
                record['amountPaid'] += transaction['totalUsd']
                record['numberOfTransactions'] += 1

    divideBy = record['numberOfTransactions'] if record['numberOfTransactions'] != 0 else 1
    record['amountPaid'] = round(record['amountPaid'], 2)
    record['avgPaidPr'] = round((record['amountPaid'] / divideBy), 2)

burnRate = sorted(burnRate, key=lambda i: arrow.get(i['date']), reverse=True)
with open('result_03_burnRate.json', 'w') as sortedBurnRate:
    json.dump(burnRate, sortedBurnRate)
    sortedBurnRate.close()
