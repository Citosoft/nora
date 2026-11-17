import assert from "node:assert/strict";
import test from "node:test";
import { workflowRequestTargets } from "@/components/app/logic/workflowRequests";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { threadSummary, threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import { snapshotBot } from "@shared/bots/snapshot";
import { bot } from "../shared/bots/fixtures";

test("workflow requests include active stages and delegated bot questions without unrelated threads", () => {
  const root = threadSummary("stage"); root.pendingRequestCount = 1;
  const child = threadSummary("delegate"); child.conversation.parentId = "stage"; child.pendingRequestCount = 1;
  child.conversation.bot = snapshotBot(bot("qa-bot"));
  const unrelated = threadSummary("unrelated"); unrelated.pendingRequestCount = 1;
  const targets = workflowRequestTargets([{ roleId: "implementation", name: "Implementation", kind: "writer", toolId: "codex", model: null,
    instructions: "Implement", conversationId: "stage" }], [root, child, unrelated]);
  assert.deepEqual(targets.map((target) => [target.conversationId, target.stageName]), [["stage", "Implementation"], ["delegate", "Implementation"]]);
  assert.deepEqual(targets[1].bot?.avatar, child.conversation.bot.avatar);
  assert.deepEqual(workflowRequestTargets([], [root, child]), []);
});

test("workflow threads stay out of normal and pinned navigation while remaining openable from the workflow", async () => {
  const f = threadWorkspaceFixture();
  const hidden = threadSummary("workflow-stage"); hidden.conversation.source = { kind: "workflow", projectId: "shell", runId: "workflow", stageId: "implementation" };
  f.summaries.push(hidden);
  const store = createThreadWorkspaceStore(f.deps); await store.refresh();
  store.setPinned(hidden.conversation.id, true);
  assert.ok(store.openThread(hidden.conversation.id));
  for (const filter of ["all", "settled"] as const) {
    assert.equal(buildThreadNavigation(store.snapshot(), null, filter).some((row) => row.id === hidden.conversation.id), false);
  }
});
