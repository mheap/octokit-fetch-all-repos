import plugin from "./fetch-repos.js";

export default function (octokit) {
  return {
    fetchAllRepos: plugin.bind(null, octokit),
  };
}
