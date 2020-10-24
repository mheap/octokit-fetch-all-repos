const plugin = require("./fetch-repos.js");

module.exports = function (octokit) {
  octokit.repos.fetchAll = plugin.bind(null, octokit);
};
