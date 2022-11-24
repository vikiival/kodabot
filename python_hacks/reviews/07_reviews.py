import requests
import json
import arrow

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
          closedAt
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
          closedAt
        }
        pageInfo {
          endCursor
        }
      }
    }
  }
}''' % startCursor)

  header = {'Authorization': 'token HERE_COMES_YOUR_TOKEN'}
  url = 'https://api.github.com/graphql'
  r = requests.post(url=url, headers=header, json={'query': query})
  # print(r.text)
  pullRequestsRaw = json.loads(r.text)['data']['organization']['repository']['pullRequests']
  pullRequests = []

  for pr in pullRequestsRaw['nodes']:
    prState = pr['state']
    if prState == 'CLOSED' or prState == 'MERGED':
      print(pr)
      if arrow.get(pr['closedAt']).date() >= arrow.get('2022-07-13').date():
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

def getReviewers(prNumber):
    query = ('''
    query MyQuery($name: String = "nft-gallery", $owner: String = "kodadot", $number: Int = %s) {
  repository(name: $name, owner: $owner) {
    pullRequest(number: $number) {
      reviews(first: 10) {
        edges {
          node {
            author {
              login
            }
            state
          }
        }
      }
      author {
        login
      }
    }
  }
}''' % prNumber)
    header = {"Authorization": "token HERE_COMES_YOUR_TOKEN"}
    url = 'https://api.github.com/graphql'
    r = requests.post(url=url, headers=header, json={'query': query})
    pr = json.loads(r.text)['data']['repository']['pullRequest']
    prAuthor = pr['author']['login']
    edges = pr['reviews']['edges']
    reviews = []
    if edges != []:
      for edge in edges:
        if edge['node'] != {} and edge['node']['author']['login'] != prAuthor:
          reviews.append(edge['node'])
      return reviews

    else:
      print(f"no reviews {prNumber}")

allPrReviews = []
allPrReviewInteractions = []
allPrNumbers = getAllPrNumbers()
for prNumber in allPrNumbers:
  totalPrReviews = []
  totalPrInteractions = []
  reviews = getReviewers(prNumber)
  print(reviews)
  if reviews != None:
    for node in reviews:
      totalPrInteractions.append(node['author']['login'])
      totalPrReviews.append(node['author']['login'])
    # get unique values from totalPrReviews
    uniquePrReviews = list(set(totalPrReviews))
    # add values from uniquePrReviews to allPrReviews
    allPrReviews += uniquePrReviews
    allPrReviewInteractions += totalPrInteractions

# count all of the values in allPrReviews and allPrReviewInteractions and store them in two separate dictionaries
prReviewCount = {}
prReviewInteractionCount = {}
print(allPrReviews)
for i in allPrReviews:
  if i in prReviewCount:
    prReviewCount[i] += 1
  else:
    prReviewCount[i] = 1
for i in allPrReviewInteractions:
  if i in prReviewInteractionCount:
    prReviewInteractionCount[i] += 1
  else:
    prReviewInteractionCount[i] = 1

print(prReviewCount)
print(prReviewInteractionCount)

# dump both dictionaries to json files
with open('prReviewCount.json', 'w') as f:
  json.dump(prReviewCount, f)
f.close()
with open('prReviewInteractionCount.json', 'w') as f:
  json.dump(prReviewInteractionCount, f)
f.close()

# dump the combined result into single json file
# format: {"prReviewer": {"prReviewCount": x, "prReviewInteractionCount": y}}
combinedResult = {}
for i in prReviewCount:
  combinedResult[i] = {"prReviewCount": prReviewCount[i], "prReviewInteractionCount": prReviewInteractionCount[i]}

# dump combinedResult to json file
with open('combinedResult.json', 'w') as f:
  json.dump(combinedResult, f)
f.close()


# #### new code
# with open('combinedResult.json', 'r') as f:
#   f = json.load(combinedResult)

# new_list = []
# for key, val in f.items():
#     new_list.append([key, val])

# print(new_list)
