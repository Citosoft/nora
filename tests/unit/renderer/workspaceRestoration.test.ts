import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { resolveThreadShellNavigation } from "@/components/app/logic/thread-workspace/shellNavigation";
import { threadSummary, threadWorkspaceFixture } from "./threadWorkspaceFixtures";

test("registering the restored workspace preserves a DM selected ahead of a later-opened thread", async () => {
  const f = threadWorkspaceFixture();
  const dm = threadSummary("dm");
  dm.conversation.direct = { botId: "ada", name: "Ada", role: "Helper", avatar: { seed: 7 },
    scope: { kind: "global" }, workspaceId: "project" };
  f.summaries.push(dm);
  const store = createThreadWorkspaceStore(f.deps);
  store.focusWorkspace("project");
  await store.refresh();
  const dmId = store.openThread("dm");
  assert.ok(dmId);
  const laterId = store.openDraft({ workspaceId: "project", text: "Another thread" });
  assert.ok(laterId);
  store.focusDocument(dmId);

  const restored = createThreadWorkspaceStore(f.deps);
  restored.updateBoot(f.deps.boot);
  restored.focusWorkspace("project");
  assert.equal(restored.snapshot().layout.activeId, dmId);
  assert.deepEqual(restored.snapshot().layout.openIds, [dmId, laterId]);
  assert.deepEqual(resolveThreadShellNavigation(restored.snapshot(), 0), { kind: "reveal", projectId: "shell" });
  assert.equal(createThreadWorkspaceStore(f.deps).snapshot().layout.activeId, dmId);
});

test("registering the restored workspace does not reveal a thread over a saved file or Home", () => {
  for (const deactivate of ["deactivate", "showHome"] as const) {
    const f = threadWorkspaceFixture();
    const store = createThreadWorkspaceStore(f.deps);
    store.openDraft({ workspaceId: "project", text: "Keep this open" });
    store[deactivate]();

    const restored = createThreadWorkspaceStore(f.deps);
    restored.updateBoot(f.deps.boot);
    restored.focusWorkspace("project");
    assert.equal(restored.snapshot().layout.activeId, null);
    assert.equal(restored.snapshot().layout.openIds.length, 1);
    assert.deepEqual(resolveThreadShellNavigation(restored.snapshot(), 0), { kind: "unchanged" });
  }
});

test("switching to another workspace still selects an open thread there", () => {
  const store = createThreadWorkspaceStore(threadWorkspaceFixture().deps);
  const personalId = store.openDraft({ workspaceId: "personal", text: "Personal work" });
  store.openDraft({ workspaceId: "project", text: "Project work" });
  store.focusWorkspace("personal");
  assert.equal(store.snapshot().layout.focusedWorkspaceId, "personal");
  assert.equal(store.snapshot().layout.activeId, personalId);
});
