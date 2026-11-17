import { buildChangesCheckoutOptions, getChangesCheckoutBranch, getChangesCheckoutPath } from "@/components/app/logic/changesCheckoutOptions";
import type { AppState, ProjectSummary, WorktreeRecord } from "@shared/appTypes";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import assert from "node:assert/strict";
import test from "node:test";
import { threadSummary } from "./threadWorkspaceFixtures";

const project = { id: "project-1", rootPath: "/repo", baseBranch: "feature/v3", platform: "darwin" } as ProjectSummary;
const loop = { id: "loop", path: "/nora/worktrees/loop", branch: "loop/run", status: "ready" } as WorktreeRecord;
const creating = { id: "pending", path: "/nora/worktrees/pending", branch: "loop/next", status: "creating" } as WorktreeRecord;

function snapshot(changesRoot: string | null): Pick<AppState, "project" | "worktrees" | "changesRoot"> {
  return { project, worktrees: [loop, creating], changesRoot };
}

function thread(id: string, path: string, archived = false): ConversationSummary {
  const summary = threadSummary(id);
  return { ...summary, conversation: { ...summary.conversation, title: `Thread ${id}`, workspace: { ...summary.conversation.workspace, path },
    archivedAt: archived ? "2026-11-10T00:00:00.000Z" : null } };
}

test("buildChangesCheckoutOptions lists the project checkout then ready worktrees with the threads working in each", () => {
  const options = buildChangesCheckoutOptions(snapshot(null), [thread("a", "/repo/"), thread("b", loop.path), thread("c", loop.path, true)]);

  assert.deepEqual(options, [
    { path: "/repo", kind: "project", branch: "feature/v3", threads: [{ id: "a", title: "Thread a" }] },
    { path: loop.path, kind: "worktree", branch: "loop/run", threads: [{ id: "b", title: "Thread b" }] }
  ]);
});

test("the Changes checkout path and branch follow the selection, defaulting to the project checkout", () => {
  assert.equal(getChangesCheckoutPath(snapshot(null)), "/repo");
  assert.equal(getChangesCheckoutBranch(snapshot(null)), "feature/v3");
  assert.equal(getChangesCheckoutPath(snapshot(loop.path)), loop.path);
  assert.equal(getChangesCheckoutBranch(snapshot(loop.path)), "loop/run");
});
