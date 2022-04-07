# KodaBot


This bot was made to help with workflow, assigning issues and storing payout data about successfuly merged PRs with bounties at KodaDot.

Extension which should generate and merge LEADERBOARD.md at command, is currently in development.

1. Make sure to adjust enviroment variables before attempting to test at your repo.
2. GitHub Personal Key needs to be generated and GitHub account linked
3. Cloudflare Account specs need to be set in enviroment variables, namespaces for Issues and Pulls need to be created in KV Workers section manually at
   https://dash.cloudflare.com/!!!yourAccountId!!!/workers/kv/namespaces
4. Stored variables need to be adjusted according to your preferences, `goPhrases` and `payoutPhrase` specifically, in order to have bot triggered.
5. For testing purposes, assigned period is currently set to `bountyLabel * 3 in 'seconds'` i.e. `$` produces assignment period of `24*3 = 72 seconds`. This setting can be
   changed in `functions.js` at
```
let lockedPeriod = now.add(bountyLabel * 3, 'seconds');
```
6. Bot mainly works with two objects, which are stored as values to the keys in KV workers, one for `issues` (assigning) and the other one for `pulls` (storing payout data)

```
issues - storing issue data triggered by goPhrase
key: issue number
value: {
  assignee: string, // name of the assignee
  lockedPeriod: string, // date until assignment is valid
  prOpened: string,  // linked PR, set to '' in the beginning and changed after PR is open
}
```  

```
pulls - storing payout data triggered by payoutPhrase
key: prNumber
value:{  
  prLeaderboard: boolean, // showing if this pull was already accounted for in LEADERBOARD.md -> tbd   
  prNumber: number,  // this is also a key, but temporarily storing this inside as well -> tbd
  prAuthor: string,  
  prState: string,  //open, merged, closed...
  githubLink: string,  
  transactions: [  
    {  
      transactionResult: string, //  
      paidUsd: number,  
      paidKsm: number,  
      subscanLink: string,
      subscanHash: string,
    }],
  prMergedDate: string,
  commits: number,
  linesAdded: number,
  linesRemoved: number
  }
}
```
