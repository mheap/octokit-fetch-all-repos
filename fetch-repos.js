export default function (octokit, opts) {
  return new Promise(async (resolve, reject) => {
    opts = {
      visibility: "all",
      minimum_access: "pull",
      include_forks: true,
      include_archived: false,
      include_templates: false,
      ...opts,
    };

    // These fields are lowercase in the API response
    opts.minimum_access = opts.minimum_access.toLowerCase();

    try {
      if (!opts.owner) {
        return reject(`'owner' parameter is required`);
      }

      // Ensure the owner exists, and is an org if provided with a 'user/team' format
      const { owner, team_slug, owner_type } = await validateOwner(opts.owner);

      // Configure the Octokit methods to use to fetch repos
      const is_org = owner_type === "Organization";

      let route;
      let options;
      if (is_org) {
        if (team_slug) {
          route = octokit.teams.listReposInOrg;
          options = { org: owner, team_slug };
        } else {
          route = octokit.repos.listForOrg;
          options = { org: owner };
        }
      } else {
        route = octokit.repos.listForUser;
        options = { username: owner };
      }

      // Add media type to get `is_template` field
      options.mediaType = {
        previews: ["baptiste"],
      };

      // Fetch all the repos
      const repos = await octokit.paginate(route, options, (response) => {
        return response.data.filter((r) => {
          // Visibility
          if (opts.visibility === "public" && r.private) {
            return false;
          }
          if (opts.visibility === "private" && !r.private) {
            return false;
          }

          // Do we have access?
          // permissions is only returned if auth is provided
          if (!r.permissions && opts.minimum_access !== "pull") {
            return false;
          }

          if (r.permissions && !r.permissions[opts.minimum_access]) {
            return false;
          }

          // Forks
          if (!opts.include_forks && r.fork) {
            return false;
          }

          // Archived
          if (!opts.include_archived && r.archived) {
            return false;
          }

          // Templates
          if (!opts.include_templates && r.is_template) {
            return false;
          }

          return true;
        });
      });

      return resolve(repos);
    } catch (e) {
      return reject(e.message);
    }
  });

  async function validateOwner(name) {
    let team;
    let owner;
    try {
      if (name.includes("/")) {
        [owner, team] = name.split("/");
      } else {
        owner = name;
      }

      const {
        data: { type: owner_type },
      } = await octokit.users.getByUsername({
        username: owner,
      });
      const is_org = owner_type === "Organization";

      if (!is_org && team) {
        throw new Error(
          "The provided 'owner' is not an organization, and so can not have teams",
        );
      }

      return { owner, team_slug: team, owner_type };
    } catch (e) {
      if (e.status === 404) {
        throw new Error(`The user/org '${owner}' could not be found`);
      }
      throw e;
    }
  }
}
