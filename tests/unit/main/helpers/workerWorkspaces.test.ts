import assert from "node:assert/strict";
import test from "node:test";
import { createWorkerWorkspaces } from "@main/helpers/workerWorkspaces";
import { createInitialState } from "@main/orchestrator/createAppInitialState";
import { noraToolsStatus } from "@shared/nora-tools/catalog";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ProjectSummary, WorktreeRecord } from "@shared/appTypes";
import type { WorkerWorkspacesDeps } from "@main/types/nora-tools/workerWorkspaces.types";

function setup() {
  const time = "2026-11-20T12:00:00Z";
  const workspace = { projectId: "native-project", environmentId: "local", checkoutId: "root", path: "/project", branch: "main", access: "write" as const, versionControl: "git" as const };
  const checkout = { ...workspace, checkoutId: "isolated", path: "/managed/worker", branch: "worker" };
  const project: ProjectSummary = { id: "shell-project", name: "Project", rootPath: workspace.path, gitCommonDir: "/project/.git", versionControl: "git", baseBranch: "main", framework: null, platform: "darwin", createdAt: time, updatedAt: time, lastOpenedAt: time };
  const worktree: WorktreeRecord = { id: "isolated", projectId: project.id, sessionId: "session", branch: "worker", path: checkout.path, createdFromRef: "HEAD", status: "ready", writerAgentId: null, readerAgentIds: [], terminalSessionIds: [], scripts: [], createdAt: time, updatedAt: time, lastUsedAt: time };
  const boot: NativeBoot = { environmentId: "local", cursor: 0, sharedBots: [], noraTools: noraToolsStatus("idle"), providers: [],
    personalization: { defaultRole: null, workspaceRoles: {} }, workspaces: [{ id: workspace.projectId, name: "Project", kind: "repository", shellProjectId: project.id, workspace }] };
  const calls: string[] = [];
  const deps: WorkerWorkspacesDeps = {
    boot: () => boot, nextId: () => "12345678-abcd-4321-ffff",
    async createWorktree(payload) {
      calls.push(`create:${payload.projectId}`);
      checkout.branch = payload.branch;
      return { ...createInitialState(), project, worktrees: [{ ...worktree, branch: payload.branch }] };
    },
    async syncCheckouts(projectId) {
      calls.push(`sync:${projectId}`);
      return { ...boot, workspaces: boot.workspaces.map((entry) => ({ ...entry, checkouts: [checkout] })) };
    }
  };
  return { deps, calls, workspace, checkout, boot };
}

test("worker isolation creates a managed branch and registers it before returning a writable checkout", async () => {
  const f = setup();
  const checkout = await createWorkerWorkspaces(f.deps).isolate(f.workspace, "Review the diff!");
  assert.deepEqual(f.calls, ["create:shell-project", "sync:shell-project"]);
  assert.equal(checkout.path, f.checkout.path);
  assert.equal(checkout.access, "write");
  assert.match(checkout.branch, /^nora\/worker-review-the-diff-[a-z0-9]+$/);
});

test("worker isolation reports unregistered workspaces and checkouts without silently sharing the parent", async () => {
  const f = setup();
  f.boot.workspaces[0].shellProjectId = undefined;
  await assert.rejects(createWorkerWorkspaces(f.deps).isolate(f.workspace, "Task"), /Open it as a project/);
  assert.deepEqual(f.calls, []);
  f.boot.workspaces[0].shellProjectId = "shell-project";
  f.deps.syncCheckouts = async () => f.boot;
  await assert.rejects(createWorkerWorkspaces(f.deps).isolate(f.workspace, "Task"), /not registered yet/);
});
