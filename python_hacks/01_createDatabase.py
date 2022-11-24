from urllib.request import Request, urlopen
from bs4 import BeautifulSoup as soup
import re
import requests
import json
import os


def getLinkedIssues(prNumber):
    query = ('''
    {
      resource(url: "https://github.com/kodadot/nft-gallery/pull/%s") {
        ... on PullRequest {
          closingIssuesReferences(first: 10) {
            nodes {
              number
            }
          }
        }
      }
    }''' % prNumber)
    header = {"Authorization": "token HERE_INSERT_YOUR_TOKEN"}
    url = 'https://api.github.com/graphql'
    r = requests.post(url=url, headers=header, json={'query': query})
    if (json.loads(r.text)['data']['resource'] == None):
        return print('null', prNumber)
    y = json.loads(r.text)[
        'data']['resource']['closingIssuesReferences']['nodes']
    linkedIssues = []
    for issue in y:
        linkedIssues.append(str(issue['number']))
    return linkedIssues


def getCommentsCount(prNumber):
    query = ('''
    {
      resource(url: "https://github.com/kodadot/nft-gallery/pull/%s") {
        ... on PullRequest {
          title
          comments {
              totalCount
            }
          }
        }
    }''' % prNumber)
    header = {'Authorization': 'token HERE_INSERT_YOUR_TOKEN'}
    url = 'https://api.github.com/graphql'
    r = requests.post(url=url, headers=header, json={'query': query})
    if (json.loads(r.text)['data']['resource'] == None):
        return print('null', prNumber)
    y = json.loads(r.text)['data']['resource']['comments']['totalCount']
    return str(y)


def getPullRequest(prNumber):
    query = ('''
{
  resource(url: "https://github.com/kodadot/nft-gallery/pull/%s") {
    ... on PullRequest {
      author {
        login
      }
      state
      closingIssuesReferences(first: 10) {
        nodes {
          number
        }
      }
      comments(first: 100) {
        totalCount
        edges {
          node {
            author{
              login
            }
            body
          }
        }
      }
      permalink
      mergedAt
      closedAt
      commits(first: 100) {
        totalCount
      }
      additions
      deletions
    }
  }
}
      ''' % prNumber)
    header = {'Authorization': 'token HERE_INSERT_YOUR_TOKEN'}
    url = 'https://api.github.com/graphql'
    r = requests.post(url=url, headers=header, json={'query': query})
    if (json.loads(r.text)['data']['resource'] == None):
        return print('null', prNumber)
    y = json.loads(r.text)['data']['resource']
    return y


def getSubscanResult(extrinsicHash):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'HERE_INSERT_YOUR_TOKEN'
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

    if response['code'] == 400 or response['data'] == None or response is None:
        transaction = {
            'transactionSuccess': False,
            'subscanLink': f'https://kusama.subscan.io/extrinsic/{extrinsicHash}',
            'subscanHash': extrinsicHash}

        return transaction
    else:
        timestamp = int(response['data']['block_timestamp'])
        transaction = {
            'transactionSuccess': response['data']['success'],
            'subscanLink': f'https://kusama.subscan.io/extrinsic/{extrinsicHash}',
            'subscanHash': extrinsicHash}
        print('transaction in subscan function', transaction)
        return transaction


def getSubscanPrice(timestamp):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'HERE_INSERT_YOUR_TOKEN'
    }

    json_data = {
        'time': timestamp,
    }

    response = json.loads(requests.post(
        'https://kusama.api.subscan.io/api/open/price', headers=headers, json=json_data).text)
    if response['code'] == 400:
        return 0
    return response['data']['price']


def getPrNumbers(startCursor=''):
    if startCursor == '':
        query = ('''
    {
  organization(login: "kodadot") {
    repository(name: "nft-gallery") {
      pullRequests(
        first: 100
        orderBy: {field: UPDATED_AT, direction: DESC}

      ) {
        nodes {
          number
          state
        }
        pageInfo {
          endCursor
        }
      }
    }
  }
}''')
    else:
        query = ('''
    {
  organization(login: "kodadot") {
    repository(name: "nft-gallery") {
      pullRequests(
        first: 100
        orderBy: {field: UPDATED_AT, direction: DESC}
        after: "%s"

      ) {
        nodes {
          number
          state
        }
        pageInfo {
          endCursor
        }
      }
    }
  }
}''' % startCursor)

    header = {'Authorization': 'token HERE_INSERT_YOUR_TOKEN'}
    url = 'https://api.github.com/graphql'
    r = requests.post(url=url, headers=header, json={'query': query})
    # print(r.text)
    pullRequestsRaw = json.loads(
        r.text)['data']['organization']['repository']['pullRequests']
    pullRequests = []

    for pr in pullRequestsRaw['nodes']:
        prState = pr['state']
        if prState == 'CLOSED' or prState == 'MERGED':
            # print(prState)
            pullRequests.append(pr['number'])
    endCursor = pullRequestsRaw['pageInfo']['endCursor']

    return {endCursor: pullRequests}


def getAllPrNumbers():
    endCursor = ''
    allThePullRequests = []
    for x in range(100):

        if endCursor == None:
            break
        result = getPrNumbers(endCursor)
        for i in result:
            print(endCursor)
            endCursor = i
            allThePullRequests += result[i]

    return allThePullRequests


skippingList = ["github-actions", "renovate", "kodabot",
                "dependabot", "snyk-bot", "imgbot", "deepsource-autofix"]
prNumbers = getAllPrNumbers()

# create result_01_pullDatabase.json if it doesn't exist

if not os.path.exists('result_01_pullDatabase.json'):
    with open('result_01_pullDatabase.json', 'w') as outfile:
        json.dump([], outfile)

with open('result_01_pullDatabase.json', 'r') as fp:
    pullDatabase = json.load(fp)
    fp.close()
for prNumber in prNumbers:
    print(prNumber)
    arrayToBeChecked = []
    for i in pullDatabase:
        arrayToBeChecked.append(i['prNumber'])
    if prNumber in arrayToBeChecked:
        print(f'ALREADY DONE:{prNumber}')
        continue
    y = getPullRequest(prNumber)
    if y['author']['login'] in skippingList:
        continue
    transactions = []
    for comment in y['comments']['edges']:
        if comment['node']['author']['login'] == 'yangwao':
            commentBody = comment['node']['body']
            if 'https://kusama.subscan.io/extrinsic/' in commentBody:
                print('there is a transaction')
                try:
                    extrinsicPart = commentBody.split(
                        'https://kusama.subscan.io/extrinsic/')[1],
                    extrinsicPart = extrinsicPart[0],
                    indx = extrinsicPart[0].index(')'),
                    indx = int(indx[0])
                    extrinsicHash = extrinsicPart[0][:indx]
                    transaction = getSubscanResult(extrinsicHash)
                    print('TRANSACTION HERE', transaction)
                    transactions.append(transaction)
                except:
                    transactions = []
                    req = Request(y['permalink'], headers={
                                  'User-Agent': 'Mozilla/5.0'})
                    webpage = urlopen(req).read()
                    page_soup = soup(webpage, 'html.parser')
                    scrapedTransactions = page_soup.findAll(
                        'a', href=re.compile('^https://kusama.subscan.io/extrinsic/'))
                    for transaction in scrapedTransactions:
                        try:
                            subscanLink = transaction.get('href')
                            extrinsicHash = subscanLink.split(
                                'https://kusama.subscan.io/extrinsic/')[1]
                            transaction = getSubscanResult(extrinsicHash)
                            transactions.append(transaction)
                        except:
                            continue
                    break

    linkedIssues = []
    for issueReferences in y['closingIssuesReferences']['nodes']:
        linkedIssues.append(issueReferences['number'])
    newPull = {
        'prLeadeboard': True,
        'prNumber': prNumber,
        'prAuthor': y['author']['login'],
        'prState': y['state'],
        'githubLink': y['permalink'],
        'transactions': transactions,
        'prMergedDate': y['mergedAt'],
        'commits': y['commits']['totalCount'],
        'linesAdded': y['additions'],
        'linesRemoved': y['deletions'],
        'commentsCount': y['comments']['totalCount'],
        'linkedIssues': linkedIssues
    }
    # print(json.dumps(newPull))

    pullDatabase.append(newPull)
    # print(newPull['githubLink'])
    # print(newPull['transactions'])
    with open('result_01_pullDatabase.json', 'w') as newFile:
        json.dump(pullDatabase, newFile)
        newFile.close()


# ## getting PRs into format which can be uploaded to CF in bulk format

# with open('result_01_pullDatabase.json', 'r') as fp:
#   pullDatabase = json.load(fp)
#   fp.close()

# newData = []
# for i in pullDatabase:
#   onePr = {}
#   onePr['key'] = str(i['prNumber'])
#   onePr['value'] = str(i)
#   # print(onePr)
#   newData.append(onePr)
#   # print(newData)
# with open('cf_pulls_ready.json', 'w') as outfile:
#     json.dump(newData, outfile)
