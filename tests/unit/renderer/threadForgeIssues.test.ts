import assert from "node:assert/strict";
import test from "node:test";
import { createThreadForgeClient } from "@/components/app/logic/createThreadForgeClient";
import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import type { ForgeOverview, ForgeRequestOptions } from "@shared/appTypes";

const overview: ForgeOverview = {
  repo: { provider: "github", host: "github.com", owner: "team", name: "repo", fullName: "team/repo", webUrl: "https://github.com/team/repo" },
  issues: [{ id: "42", number: 42, title: "Fix login", state: "open", author: "Dan", sourceBranch: null, targetBranch: null, sourceRepository: "team/repo", webUrl: "https://github.com/team/repo/issues/42", updatedAt: "2026-11-13T12:00:00Z" }],
  pullRequests: [], workflowRuns: [], gitlabUserMergeRequests: [], gitlabUserMergeRequestsErrorMessage: null, errorMessage: null
};

test("issue suggestions read the requested workspace using the credential-bound forge client", async (context) => {
  const options: ForgeRequestOptions = { githubToken: "test-token" };
  const read = context.mock.method(noraIntegrationClient, "getForgeOverview", async (projectId: string, received: ForgeRequestOptions) => {
    assert.equal(projectId, "thread-workspace");
    assert.strictEqual(received, options);
    return overview;
  });
  const client = createThreadForgeClient(options);
  assert.strictEqual(await client.readIssues("thread-workspace"), overview.issues);
  assert.equal(read.mock.callCount(), 1);
});

test("repository connection and provider failures remain explicit instead of becoming empty issue lists", async (context) => {
  context.mock.method(noraIntegrationClient, "getForgeOverview", async (): Promise<ForgeOverview> => ({ ...overview, repo: null }));
  await assert.rejects(createThreadForgeClient({}).readIssues("workspace"), /Connect a GitHub or GitLab repository/);
  context.mock.method(noraIntegrationClient, "getForgeOverview", async (): Promise<ForgeOverview> => ({ ...overview, repo: null, errorMessage: "Sign in to GitLab again." }));
  await assert.rejects(createThreadForgeClient({}).readIssues("workspace"), /Sign in to GitLab again/);
});
