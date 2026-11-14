import assert from "node:assert/strict";
import test from "node:test";
import { resolveThreadShellNavigation } from "@/components/app/logic/thread-workspace/shellNavigation";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";

test("Home reveals the workspace surface after a merge request has deactivated the thread", () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const id = store.openDraft({ workspaceId: "project", text: "Keep this draft" });
  assert.ok(id);
  const layout = store.snapshot().layout;
  const revision = store.snapshot().focusRevision;
  store.deactivate();
  assert.deepEqual(resolveThreadShellNavigation(store.snapshot(), revision), { kind: "unchanged" });

  store.showHome();
  assert.equal(store.snapshot().layout.activeId, null);
  assert.deepEqual(resolveThreadShellNavigation(store.snapshot(), revision), { kind: "reveal", projectId: null });
  assert.equal(store.snapshot().layout.focusedWorkspaceId, "project");
  assert.deepEqual(store.snapshot().layout.documents, layout.documents);
  assert.deepEqual(store.snapshot().layout.openIds, layout.openIds);
  assert.equal(f.commands.length, 0);

  store.focusDocument(id);
  assert.equal(store.snapshot().layout.activeId, id);
  assert.equal(store.snapshot().layout.documents[0]?.text, "Keep this draft");
});

test("Home can replace another foreground view even when Home was already selected in the thread store", () => {
  const store = createThreadWorkspaceStore(threadWorkspaceFixture().deps);
  store.showHome();
  const revision = store.snapshot().focusRevision;
  assert.deepEqual(resolveThreadShellNavigation(store.snapshot(), revision), { kind: "unchanged" });
  store.showHome();
  assert.deepEqual(resolveThreadShellNavigation(store.snapshot(), revision), { kind: "reveal", projectId: null });
});

test("thread focus continues to reveal its owning project and Home clears its active selection", () => {
  const store = createThreadWorkspaceStore(threadWorkspaceFixture().deps);
  const revision = store.snapshot().focusRevision;
  store.openDraft({ workspaceId: "project" });
  assert.deepEqual(resolveThreadShellNavigation(store.snapshot(), revision), { kind: "reveal", projectId: "shell" });
  const focusedRevision = store.snapshot().focusRevision;
  store.showHome();
  assert.equal(store.snapshot().layout.activeId, null);
  assert.deepEqual(resolveThreadShellNavigation(store.snapshot(), focusedRevision), { kind: "reveal", projectId: null });
});

test("Home remains visible for this session when view persistence fails", () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  store.openDraft({ workspaceId: "project", text: "Unsaved work" });
  const revision = store.snapshot().focusRevision;
  f.setUnavailable(true);
  store.showHome();
  assert.ok(store.snapshot().storageError);
  assert.equal(store.snapshot().layout.activeId, null);
  assert.deepEqual(resolveThreadShellNavigation(store.snapshot(), revision), { kind: "reveal", projectId: null });
  assert.equal(store.snapshot().layout.documents[0]?.text, "Unsaved work");
});
