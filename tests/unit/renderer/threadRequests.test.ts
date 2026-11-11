import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { threadRequestTarget, threadRequestTargets } from "@/components/app/logic/thread-workspace/requests";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";

test("branch PR lookup requires the owning connected repository", async () => {
  const f = threadWorkspaceFixture();
  const workspace = f.deps.boot.workspaces[1];
  assert.ok(workspace);
  assert.deepEqual(threadRequestTarget(workspace.workspace, workspace), { key: '["shell","main"]', projectId: "shell", branch: "main" });
  for (const change of [{ branch: "" }, { versionControl: "none" as const }, { environmentId: "other" }, { projectId: "other" }, { path: "/other" }]) {
    assert.equal(threadRequestTarget({ ...workspace.workspace, ...change }, workspace), null);
  }
  assert.equal(threadRequestTarget(workspace.workspace, { ...workspace, shellProjectId: undefined }), null);
  assert.equal(threadRequestTarget(undefined, workspace), null);
});

test("visible threads share one lookup per repository branch", async () => {
  const f = threadWorkspaceFixture();
  f.summaries[0].conversation.workspace = f.deps.boot.workspaces[1].workspace;
  const second = structuredClone(f.summaries[0]); second.conversation.id = "second";
  const hidden = structuredClone(second); hidden.conversation.id = "hidden"; hidden.conversation.workspace.branch = "hidden";
  f.summaries.push(second, hidden);
  const store = createThreadWorkspaceStore(f.deps); await store.refresh();
  assert.deepEqual(threadRequestTargets(store.snapshot(), ["existing", "second"]), [
    { key: '["shell","main"]', projectId: "shell", branch: "main", conversationIds: ["existing", "second"] }
  ]);
});
