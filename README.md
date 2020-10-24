# octokit-fetch-all-repos

This plugin allows you to fetch all repos for a `user`, `org` or `team` on GitHub in a single request, optionally filtering out `archived`, `forked`, `template`, `public` or `private` repositories. You may also filter down to repos that you only have `pull/push/admin` access to.

## Installation

```bash
npm install octokit-fetch-all-repos --save
```

# Usage

```javascript
let { Octokit } = require("@octokit/rest");
Octokit = Octokit.plugin(require("octokit-fetch-all-repos"));

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Values in capitals are the default behaviour
// Only `owner` is required
const repos = await octokit.repos.fetchAll({
  owner: "user OR org OR org/team",
  visibility: "ALL/public/private",
  minimum_access: "PULL/push/admin",
  include_forks: "TRUE/false",
  include_archived: "true/FALSE",
  include_templates: "true/FALSE",
});
```
