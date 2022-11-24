import requests
import json
import math
import arrow


def getSubscanResult(extrinsicHash):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'HERE_INSERT_YOUR_KEY'
    }
    # print(extrinsicHash)
    if len(extrinsicHash) < 20:
        json_data = {
            'extrinsic_index': extrinsicHash
        }
    else:
        json_data = {
            'hash': extrinsicHash,
        }
    response = json.loads(requests.post(
        'https://kusama.api.subscan.io/api/scan/extrinsic', headers=headers, json=json_data).text)

    return response['data']['transfer']['to']


def getSubscanPrice(timestamp):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'HERE_INSERT_YOUR_KEY'
    }

    json_data = {
        'time': timestamp,
    }

    response = json.loads(requests.post(
        'https://kusama.api.subscan.io/api/open/price', headers=headers, json=json_data).text)
    if response['code'] == 400:
        return 0
    return round(float(response['data']['price']), 2)


def getSubscanTransactionCount(address):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'HERE_INSERT_YOUR_KEY'
    }
    json_data = {
        'row': 1,
        'page': 0,
        'address': address,
    }
    response = json.loads(requests.post(
        'https://kusama.api.subscan.io/api/scan/transfers', headers=headers, json=json_data).text)
    return response['data']['count']


def getSubscanTransactions(dev, address, x, transactionsList):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'HERE_INSERT_YOUR_KEY'
    }
    json_data = {
        'row': 100,
        'page': x,
        'address': address,
    }
    response = json.loads(requests.post(
        'https://kusama.api.subscan.io/api/scan/transfers', headers=headers, json=json_data).text)
    data = response['data']['transfers']
    print('data length is', len(data))
    for i in data:
        transaction = {}
        if i['from'] == yangWaoAddress or i['from'] == kodaGuildRewards and i['success'] == True:
            transaction['dev'] = dev
            transaction['from'] = i['from']
            transaction['to'] = i['to']
            transaction['totalKsm'] = round(float(i['amount']), 3)
            transaction['totalUsd'] = round(
                float(i['amount']) * getSubscanPrice(i['block_timestamp']), 2)
            transaction['block_timestamp'] = i['block_timestamp']
            transaction['date'] = arrow.get(
                i['block_timestamp']).format('YYYY-MM-DD HH:mm:ss')
            hash = i['hash']
            transaction['link'] = f'https://kusama.subscan.io/extrinsic/{hash}'
            print(transaction)
            transactionsList.append(transaction)

    return transactionsList


def getTransactionsForDev(dev, address, transactionsList):
    count = getSubscanTransactionCount(address)
    print(count, address)
    pages = math.ceil(count / 100)
    for i in range(0, pages):
        transactionsList = getSubscanTransactions(
            dev, address, i, transactionsList)
    return transactionsList


yangWaoAddress = 'CuHWHNcBt3ASMVSJmcJyiBWGxxiWLyjYoYbGjfhL4ovoeSd'
kodaGuildRewards = 'G29NScLSew5zqwmJAPupvJWDCDkpxKUhDnMeVdD2BBcnHar'

with open('result_04_addresses.json') as f:
    addressList = json.load(f)


transactionsList = []
for record in addressList:
    print('DEV', record)
    print('addressList', addressList[record])
    if len(addressList[record]) == 1:
        address = addressList[record][0]
        devDict = getTransactionsForDev(record, address, transactionsList)
    else:
        for address in addressList[record]:
            devDict = getTransactionsForDev(record, address, transactionsList)
    print(transactionsList)


transactionsList = sorted(
    transactionsList, key=lambda d: d['block_timestamp'], reverse=True)
with open('result_05_transactionsList.json', 'w') as outfile:
    json.dump(transactionsList, outfile)
    outfile.close()
