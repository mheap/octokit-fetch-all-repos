import plugin from "./fetch-repos";
import { Octokit } from "@octokit/rest";
import nock from "nock";

nock.disableNetConnect();
const octokit = new Octokit({
  log: {
    error: () => {},
  },
});

function run(body) {
  return plugin(octokit, body);
}

test(`missing required parameter owner`, async () => {
  await expect(run({})).rejects.toEqual(`'owner' parameter is required`);
});

test(`owner does not exist`, async () => {
  const owner = "missing_user";
  mockGetUser(owner, null);

  await expect(run({ owner })).rejects.toEqual(
    `The user/org '${owner}' could not be found`,
  );
});

test(`team requested, but user is not an org`, async () => {
  const owner = "valid-user/team-one";
  mockGetUser("valid-user", "User");

  await expect(run({ owner })).rejects.toEqual(
    `The provided 'owner' is not an organization, and so can not have teams`,
  );
});

test(`requests org repos`, async () => {
  const owner = "valid-org";
  mockGetUser(owner, "Organization");
  mockGetOrgRepos(owner, [publicRepo]);

  await expect(run({ owner })).resolves.toEqual([publicRepo]);
});

test(`requests team repos`, async () => {
  const owner = "valid-org";
  const team = "team-name";
  mockGetUser(owner, "Organization");
  mockGetTeamRepos(owner, team, [publicRepo]);

  await expect(run({ owner: `${owner}/${team}` })).resolves.toEqual([
    publicRepo,
  ]);
});

const privateRepo = { private: true };
const publicRepo = { private: false };
const forkedRepo = { fork: true };
const archivedRepo = { archived: true };
const templateRepo = { is_template: true };
const repoWithPull = { permissions: { pull: true, push: false, admin: false } };
const repoWithPush = { permissions: { pull: true, push: true, admin: false } };
const repoWithAdmin = { permissions: { pull: true, push: true, admin: true } };

test(`runs with defaults`, async () => {
  // Defaults are public + private, plus forks
  // archived + templates are excluded
  mockGetUserRepos("mheap", [
    publicRepo,
    privateRepo,
    forkedRepo,
    archivedRepo,
    templateRepo,
    repoWithPull,
    repoWithPush,
    repoWithAdmin,
  ]);

  await expect(
    run({
      owner: "mheap",
    }),
  ).resolves.toEqual([
    publicRepo,
    privateRepo,
    forkedRepo,
    repoWithPull,
    repoWithPush,
    repoWithAdmin,
  ]);
});

test(`can disable forks`, async () => {
  mockGetUserRepos("mheap", [forkedRepo]);

  await expect(
    run({
      owner: "mheap",
      include_forks: false,
    }),
  ).resolves.toEqual([]);
});

test(`allows archived`, async () => {
  mockGetUserRepos("mheap", [archivedRepo]);

  await expect(
    run({
      owner: "mheap",
      include_archived: true,
    }),
  ).resolves.toEqual([archivedRepo]);
});

test(`allows templates`, async () => {
  mockGetUserRepos("mheap", [templateRepo]);

  await expect(
    run({
      owner: "mheap",
      include_templates: true,
    }),
  ).resolves.toEqual([templateRepo]);
});

test(`filters to only public`, async () => {
  mockGetUserRepos("mheap", [publicRepo, privateRepo]);

  await expect(
    run({
      owner: "mheap",
      visibility: "public",
    }),
  ).resolves.toEqual([publicRepo]);
});

test(`filters to only private`, async () => {
  mockGetUserRepos("mheap", [publicRepo, privateRepo]);

  await expect(
    run({
      owner: "mheap",
      visibility: "private",
    }),
  ).resolves.toEqual([privateRepo]);
});

test(`permissions: pull (success)`, async () => {
  mockGetUserRepos("mheap", [repoWithPull]);

  await expect(
    run({
      owner: "mheap",
      minimum_access: "pull",
    }),
  ).resolves.toEqual([repoWithPull]);
});

test(`permissions: push (success)`, async () => {
  mockGetUserRepos("mheap", [repoWithPush]);

  await expect(
    run({
      owner: "mheap",
      minimum_access: "push",
    }),
  ).resolves.toEqual([repoWithPush]);
});

test(`permissions: pull (success)`, async () => {
  mockGetUserRepos("mheap", [repoWithAdmin]);

  await expect(
    run({
      owner: "mheap",
      minimum_access: "admin",
    }),
  ).resolves.toEqual([repoWithAdmin]);
});

test(`permissions: pull (no auth, implicitly allowed)`, async () => {
  mockGetUserRepos("mheap", [publicRepo]);

  await expect(
    run({
      owner: "mheap",
      minimum_access: "pull",
    }),
  ).resolves.toEqual([publicRepo]);
});

test(`permissions: pull (no auth, implicitly disallowed)`, async () => {
  mockGetUserRepos("mheap", [publicRepo]);

  await expect(
    run({
      owner: "mheap",
      minimum_access: "push",
    }),
  ).resolves.toEqual([]);
});

test(`permissions: push (failure)`, async () => {
  mockGetUserRepos("mheap", [repoWithPull]);

  await expect(
    run({
      owner: "mheap",
      minimum_access: "push",
    }),
  ).resolves.toEqual([]);
});

test(`permissions: admin (failure)`, async () => {
  mockGetUserRepos("mheap", [repoWithPush]);

  await expect(
    run({
      owner: "mheap",
      minimum_access: "admin",
    }),
  ).resolves.toEqual([]);
});

test(`permissions: minimum_access is case insensitive`, async () => {
  mockGetUserRepos("mheap", [repoWithAdmin]);

  await expect(
    run({
      owner: "mheap",
      minimum_access: "ADMIN",
    }),
  ).resolves.toEqual([repoWithAdmin]);
});

function mockGetUser(owner, type) {
  const m = nock("https://api.github.com").get(`/users/${owner}`);
  if (type) {
    return m.reply(200, {
      type,
    });
  }
  return m.reply(404);
}

function mockGetUserRepos(owner, repos) {
  mockGetUser("mheap", "User");

  const m = nock("https://api.github.com").get(`/users/${owner}/repos`);
  return m.reply(200, repos);
}

function mockGetOrgRepos(owner, repos) {
  const m = nock("https://api.github.com").get(`/orgs/${owner}/repos`);
  return m.reply(200, repos);
}

function mockGetTeamRepos(owner, team_slug, repos) {
  const m = nock("https://api.github.com").get(
    `/orgs/${owner}/teams/${team_slug}/repos`,
  );
  return m.reply(200, repos);
}
