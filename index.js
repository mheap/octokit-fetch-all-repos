import plugin from "./fetch-repos.js";

module.exports = function (octokit) {
  return {
    fetchAllRepos: plugin.bind(null, octokit),
  };
};
