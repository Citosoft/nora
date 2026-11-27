import assert from "node:assert/strict";
import test from "node:test";
import { buildActiveTaskThreads, taskThreadKey } from "@/components/app/logic/taskThreads";
import { startTaskOnBoard } from "@/components/app/logic/taskBoardUtils";
import { conversation } from "../main/nora-tools/fixture";
import { createDefaultWorkspaceTaskBoard } from "@shared/appTypes";
import type { Conversation, ConversationRun } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";

const taskSource = (path: string, projectId = "w"): Conversation["source"] => ({ kind: "task", projectId, path });

function summary(id: string, state: ConversationRun["state"] | null, extra: Partial<Conversation> = {}): ConversationSummary {
  const entry = conversation(id, extra);
  return { conversation: entry, queuedCount: 0, pendingRequestCount: 0,
    latestRun: state ? { id: `run-${id}`, state, createdAt: entry.createdAt, updatedAt: entry.updatedAt, failure: null } : null };
}

test("a task's active thread is derived from threads started for it, with its provider", () => {
  const threads = buildActiveTaskThreads([
    summary("running", "running", { source: taskSource(".nora/tasks/build.md") }),
    summary("queued", "queued", { source: taskSource(".nora/tasks/queued.md") }),
    summary("finished", "completed", { source: taskSource(".nora/tasks/done.md") }),
    summary("failed", "failed", { source: taskSource(".nora/tasks/failed.md") }),
    summary("settled", "running", { source: taskSource(".nora/tasks/settled.md"), archivedAt: "2026-11-20T00:00:00.000Z" }),
    summary("plain", "running")
  ]);
  assert.deepEqual([...threads.keys()].sort(), [taskThreadKey("w", ".nora/tasks/build.md"), taskThreadKey("w", ".nora/tasks/queued.md")].sort());
  const running = threads.get(taskThreadKey("w", ".nora/tasks/build.md"));
  assert.deepEqual([running?.id, running?.providerKind, running?.model, running?.connection, running?.waiting],
    ["running", "claude", "claude-opus-5-5", "unknown", false]);
});

test("a thread waiting for the user still marks its task active, flagged as waiting", () => {
  const waiting = summary("waiting", "completed", { source: taskSource(".nora/tasks/ask.md") });
  waiting.pendingRequestCount = 1;
  assert.equal(buildActiveTaskThreads([waiting]).get(taskThreadKey("w", ".nora/tasks/ask.md"))?.waiting, true);
});

test("task threads stay linked when finishing moves the task file, and the newest thread wins", () => {
  const threads = buildActiveTaskThreads([
    summary("older", "running", { source: taskSource(".nora/tasks/build.md"), updatedAt: "2026-11-13T00:00:00.000Z" }),
    summary("newer", "running", { source: taskSource(".nora/tasks/build.md"), updatedAt: "2026-11-14T00:00:00.000Z" }),
    summary("other-project", "running", { source: taskSource(".nora/tasks/build.md", "elsewhere") })
  ]);
  assert.equal(threads.get(taskThreadKey("w", ".nora/tasks/completed/build.md"))?.id, "newer");
  assert.equal(threads.get(taskThreadKey("elsewhere", ".nora/tasks/build.md"))?.id, "other-project");
});

test("starting a task moves it to In Progress once, and leaves boards without that column alone", () => {
  const board = createDefaultWorkspaceTaskBoard();
  const started = startTaskOnBoard(board, ".nora/tasks/build.md");
  assert.equal(started.taskPositions[".nora/tasks/build.md"]?.sectionId, "in-progress");
  assert.equal(startTaskOnBoard(started, ".nora/tasks/build.md"), started);
  const withoutColumn = { ...board, sections: board.sections.filter((section) => section.id !== "in-progress") };
  assert.equal(startTaskOnBoard(withoutColumn, ".nora/tasks/build.md"), withoutColumn);
});
