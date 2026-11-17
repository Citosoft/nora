import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { workspaceCheckouts, workspaceForThread } from "@/components/app/logic/thread-workspace/checkouts";
import { createThreadWorktree } from "@/components/app/logic/thread-workspace/worktreeCheckout";
import type { AppState } from "@shared/appTypes";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { threadBinding, threadWorkspaceFixture } from "./threadWorkspaceFixtures";

function withWorktree(boot: NativeBoot): { boot: NativeBoot; worktree: WorkspaceRef } {
  const project = boot.workspaces.find((entry) => entry.id === "project");
  assert.ok(project);
  const worktree: WorkspaceRef = { ...project.workspace, checkoutId: "git-worktree", path: "/project-worktrees/feature", branch: "feature/a" };
  return { worktree, boot: { ...boot, workspaces: boot.workspaces.map((entry) => entry.id === "project" ? { ...entry, checkouts: [worktree] } : entry) } };
}

test("workspaceForThread keeps identity while swapping in the draft's checkout or an existing thread's own checkout", () => {
  const f = threadWorkspaceFixture();
  const { boot, worktree } = withWorktree(f.deps.boot);
  const project = boot.workspaces.find((entry) => entry.id === "project");
  assert.ok(project);
  assert.deepEqual(workspaceCheckouts(project).map((entry) => entry.checkoutId), ["git", "git-worktree"]);
  assert.equal(workspaceForThread(project, {}).workspace.checkoutId, "git");
  assert.equal(workspaceForThread(project, { checkoutId: "git-worktree" }).workspace.path, worktree.path);
  assert.equal(workspaceForThread(project, { checkoutId: "gone" }).workspace.checkoutId, "git", "A removed checkout falls back to the primary");
  const pinned = { ...worktree, checkoutId: "old-worktree", path: "/removed" };
  const forThread = workspaceForThread(project, { checkoutId: "git-worktree", conversationWorkspace: pinned });
  assert.deepEqual([forThread.id, forThread.workspace.path], ["project", "/removed"], "Existing threads keep the checkout they were created in");
});

test("a draft can run in a worktree checkout, which its create command carries; changing workspace clears it", async () => {
  const f = threadWorkspaceFixture();
  const { boot, worktree } = withWorktree(f.deps.boot);
  f.deps.boot = boot;
  const store = createThreadWorkspaceStore(f.deps);
  const id = store.openDraft({ workspaceId: "project", text: "Fix the bug" });
  assert.ok(id);
  store.selectCheckout(id, "missing");
  assert.match(store.snapshot().runtime[id]?.error ?? "", /no longer available/);
  store.selectCheckout(id, worktree.checkoutId);
  assert.equal(store.snapshot().layout.documents.find((entry) => entry.id === id)?.checkoutId, worktree.checkoutId);
  store.setBinding(id, threadBinding, "chosen");
  await store.submit(id);
  const create = f.commands.find((command) => command.kind === "create");
  assert.ok(create?.kind === "create");
  assert.deepEqual([create.workspace.projectId, create.workspace.checkoutId, create.workspace.path], ["project", worktree.checkoutId, worktree.path]);

  const other = store.openDraft({ workspaceId: "project", text: "Another" });
  assert.ok(other);
  store.selectCheckout(other, worktree.checkoutId);
  store.selectWorkspace(other, "personal");
  assert.equal(store.snapshot().layout.documents.find((entry) => entry.id === other)?.checkoutId, undefined);
});

test("a draft whose worktree was removed keeps its text and asks for another checkout", async () => {
  const f = threadWorkspaceFixture();
  const { boot, worktree } = withWorktree(f.deps.boot);
  f.deps.boot = boot;
  const store = createThreadWorkspaceStore(f.deps);
  const id = store.openDraft({ workspaceId: "project", text: "Keep me" });
  assert.ok(id);
  store.selectCheckout(id, worktree.checkoutId);
  store.updateBoot(f.deps.boot = { ...boot, workspaces: boot.workspaces.map((entry) => ({ ...entry, checkouts: undefined })) });
  store.setBinding(id, threadBinding, "chosen");
  await store.submit(id);
  assert.equal(f.commands.length, 0);
  assert.match(store.snapshot().runtime[id]?.error ?? "", /no longer available/);
  assert.equal(store.snapshot().layout.documents.find((entry) => entry.id === id)?.text, "Keep me");
});

test("createThreadWorktree creates the worktree, syncs checkouts and returns the new one", async () => {
  const f = threadWorkspaceFixture();
  const { boot, worktree } = withWorktree(f.deps.boot);
  const calls: string[] = [];
  const checkout = await createThreadWorktree("shell", "  feature/a ", {
    createWorktree: async (payload) => { calls.push(`create:${payload.projectId}:${payload.branch}`);
      return { worktrees: [{ projectId: "shell", branch: "feature/a", path: worktree.path }] } as unknown as AppState; },
    syncCheckouts: async (projectId) => { calls.push(`sync:${projectId}`); return boot; }
  });
  assert.deepEqual(calls, ["create:shell:feature/a", "sync:shell"]);
  assert.equal(checkout.checkoutId, worktree.checkoutId);
  await assert.rejects(createThreadWorktree("shell", " ", { createWorktree: async () => { throw new Error("unused"); }, syncCheckouts: async () => boot }), /branch name/);
  await assert.rejects(createThreadWorktree("shell", "other", {
    createWorktree: async () => ({ worktrees: [{ projectId: "shell", branch: "other", path: "/elsewhere" }] }) as unknown as AppState,
    syncCheckouts: async () => boot
  }), /isn't ready for threads yet/);
});
