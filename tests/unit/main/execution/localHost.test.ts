import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { openLocalHost } from "@main/execution/localHost";
import { createCheckoutInspector } from "@main/execution/workspaceGit";
import type { ExecutionHost } from "@main/execution/host";
import type { LocalHostOptions } from "@main/types/execution/localHost.types";

const execFileAsync = promisify(execFile);
const server = join(process.cwd(), "tests/unit/main/execution/fixtures/codexServer.cjs");

function awaitState(host: ExecutionHost, state: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let unsubscribe = (): void => {};
    let done = false;
    const timer = setTimeout(() => { unsubscribe(); reject(new Error(`Timed out waiting for ${state}`)); }, 5000);
    unsubscribe = host.subscribe({ after: 0, conversationId: "conversation", onError: reject, onEvent: (event) => {
      if (event.payload.kind === "run" && event.payload.run.state === state) { done = true; clearTimeout(timer); unsubscribe(); resolve(); }
    } });
    if (done) unsubscribe();
  });
}

test("local composition owns storage before recovery, runs the native protocol fixture and reopens durable state", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-local-host-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const workspace = join(directory, "checkout"); await mkdir(workspace);
  await execFileAsync("git", ["init", "-b", "test-branch", workspace]);
  const options: LocalHostOptions = { databasePath: join(directory, "state", "execution.sqlite"), environmentId: "test-local", gitExecutable: "git",
    registrations: () => [{ projectId: "project", checkoutId: "selected", path: workspace }], shutdownGraceMs: 100,
    instances: [{ kind: "codex", options: { instanceId: "fixture", executable: process.execPath, arguments: [server],
      environment: { NORA_CODEX_FIXTURE_MODE: "approval" }, policies: { safe: { approvalPolicy: "on-request", sandbox: "workspace-write" } } } }],
    onFailure(failure) { assert.fail(failure.message); } };
  const host = await openLocalHost(options);
  try {
    await assert.rejects(openLocalHost(options), /live owner/);
    const command = { kind: "create" as const, commandId: "create", conversationId: "conversation", title: "Test", parentId: null,
      workspace: { projectId: "project", environmentId: "test-local", checkoutId: "selected", path: "/untrusted", branch: "untrusted", access: "write" as const },
      provider: { kind: "codex" as const, instanceId: "fixture", model: "fixture-model", reasoning: null, permissionPolicy: "safe" } };
    const receipt = await host.execute(command);
    const catalog = await host.catalog("codex", "fixture", command.workspace);
    assert.equal(catalog.status, "available");
    assert.equal(host.header("conversation")?.conversation.workspace.branch, "test-branch");
    const approval = awaitState(host, "awaiting-approval");
    await host.execute({ kind: "submit", commandId: "submit", conversationId: "conversation", runId: "run", instruction: "Fixture only" });
    await approval;
    const request = host.header("conversation")?.pendingRequests[0]; assert.ok(request);
    const completed = awaitState(host, "completed");
    await host.execute({ kind: "respond", commandId: "answer", conversationId: "conversation", requestId: request.id,
      response: { kind: "approval", optionId: "accept" } });
    await completed;
    assert.equal(host.summaries()[0].latestRun?.state, "completed");
    assert.deepEqual(await host.shutdown(), { unconfirmedRuns: [] });
    const reopened = await openLocalHost(options);
    try {
      assert.deepEqual(await reopened.execute(command), receipt);
      assert.equal(reopened.summaries()[0].latestRun?.state, "completed");
      const history = reopened.conversationHistory({ conversationId: "conversation", scope: "timeline", limit: 2 });
      assert.ok(history.scope === "timeline" && history.items.length === 2);
    } finally { await reopened.shutdown(); }
  } finally { await host.shutdown(); }
});

test("checkout inspection distinguishes unborn branches, detached HEAD, independent worktrees and plain folders", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-git-checkout-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "repo"); const worktree = join(directory, "isolated"); const plain = join(directory, "plain folder ");
  await mkdir(plain); await execFileAsync("git", ["init", "-b", "unborn", root]);
  const inspect = createCheckoutInspector("git");
  assert.deepEqual(await inspect(root), { rootPath: root, branch: "unborn" });
  assert.deepEqual(await inspect(plain), { rootPath: plain, branch: "" });
  await execFileAsync("git", ["-C", root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "commit.gpgSign=false", "-c", `core.hooksPath=${join(directory, "unused-hooks")}`, "commit", "--allow-empty", "-m", "Fixture"]);
  await execFileAsync("git", ["-C", root, "-c", `core.hooksPath=${join(directory, "unused-hooks")}`, "worktree", "add", "-b", "isolated", worktree]);
  assert.deepEqual(await inspect(worktree), { rootPath: worktree, branch: "isolated" });
  await execFileAsync("git", ["-C", root, "-c", `core.hooksPath=${join(directory, "unused-hooks")}`, "checkout", "--detach"]);
  assert.deepEqual(await inspect(root), { rootPath: root, branch: "" });
  await assert.rejects(inspect(join(directory, "missing")));
  await assert.rejects(createCheckoutInspector(join(directory, "missing-git"))(plain));
});
