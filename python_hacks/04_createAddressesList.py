import requests
import json


def getSubscanResult(extrinsicHash):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'ab1ad97b481f5eda4a701cff6549916e'
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
    if response['code'] == 400 or response['data'] == None or response is None or response['data'] == [] or response['data']['transfer'] == None:
        return ''
    return response['data']['transfer']['to']


def getList(dict):
    return dict.keys()


with open('result_01_pullDatabase.json') as f:
    pullDatabase = json.load(f)

addressesDatabase = {}
for pullRequest in pullDatabase:
    if pullRequest['transactions'] != []:
        for transaction in pullRequest['transactions']:
            if transaction['subscanHash'] != '':
                keysList = getList(addressesDatabase)
                print(transaction['subscanHash'])
                if len(transaction['subscanHash']) != 66:
                    continue
                toAddress = getSubscanResult(transaction['subscanHash'])
                if toAddress == '' or toAddress == 'G29NScLSew5zqwmJAPupvJWDCDkpxKUhDnMeVdD2BBcnHar':
                    continue
                if pullRequest['prAuthor'] in keysList:
                    print(addressesDatabase[pullRequest['prAuthor']])
                    if toAddress in addressesDatabase[pullRequest['prAuthor']]:
                        print('Already in database',
                              pullRequest['prAuthor'], toAddress)
                        continue
                    else:
                        addressesDatabase[pullRequest['prAuthor']].append(
                            toAddress)
                        print('updated', pullRequest['prAuthor'], toAddress)
                else:
                    addressesDatabase[pullRequest['prAuthor']] = [toAddress]
                    print('added', pullRequest['prAuthor'], toAddress)

with open('result_04_addresses.json', 'w') as outfile:
    json.dump(addressesDatabase, outfile)
    outfile.close()
