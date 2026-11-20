import assert from "node:assert/strict";
import test from "node:test";
import { buildBotWorkThreads, buildChatWorkThreads } from "@/components/app/logic/chatWorkThreads";
import { chatWorkPhase, groupChatWorkThreads } from "@/components/app/logic/chatWorkGroups";
import { buildChatTimeline } from "@/components/app/logic/chatTimeline";
import { conversation } from "../main/nora-tools/fixture";
import { snapshotBot } from "@shared/bots/snapshot";
import { bot } from "../shared/bots/fixtures";
import type { ChatWorkPhase } from "@/components/app/types/chatWork.types";
import type { Conversation, ConversationRun } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";

const summary = (entry: Conversation): ConversationSummary => ({ conversation: entry, latestRun: null, queuedCount: 0, pendingRequestCount: 0 });
const ada = snapshotBot(bot("ada"));

test("a chat's work list includes nested workers, preserves bot avatars and surfaces queued and waiting work", () => {
  const rows = [
    summary(conversation("worker", { parentId: "task", source: { kind: "worker" }, bot: ada })),
    summary(conversation("task", { parentId: "chat", bot: ada })),
    summary(conversation("other", { parentId: "another-chat" }))
  ];
  rows[0].pendingRequestCount = 1;
  rows[0].queuedCount = 1;
  rows[1].conversation.archivedAt = "2026-11-20T12:00:00Z";
  const threads = buildChatWorkThreads(rows, "chat", []);
  assert.deepEqual(threads.map((entry) => entry.id).sort(), ["task", "worker"]);
  const worker = threads.find((entry) => entry.id === "worker");
  assert.equal(worker?.waiting, true);
  assert.equal(worker?.working, true);
  assert.equal(worker?.status, "Needs your attention");
  assert.deepEqual(worker?.author?.avatar, ada.avatar);
  assert.equal(threads.find((entry) => entry.id === "task")?.settled, true);
});

test("a bot's work spans chats and workspaces, including delegated workers, but stays on its host", () => {
  const task = conversation("task", { parentId: "chat", bot: ada });
  const rows = [summary(task), summary(conversation("worker", { parentId: "task", source: { kind: "worker" } })),
    summary(conversation("other-chat-task", { bot: ada, workspace: { ...task.workspace, projectId: "another-project" } })),
    summary(conversation("remote", { bot: ada, workspace: { ...task.workspace, environmentId: "another-host" } })),
    summary(conversation("rex", { bot: snapshotBot(bot("rex")) }))];
  assert.deepEqual(buildBotWorkThreads(rows, "ada", task.workspace.environmentId, []).map((entry) => entry.id).sort(), ["other-chat-task", "task", "worker"]);
});

test("task creation appears once in chronological chat history and links to the saved thread", () => {
  const threads = buildChatWorkThreads([summary(conversation("task", { parentId: "chat", bot: ada, title: "Migration", createdAt: "2026-11-20T10:01:00Z" }))], "chat", []);
  const items = [{ kind: "message" as const, id: "user", runId: "r", createdAt: "2026-11-20T10:00:00Z", role: "user" as const, text: "Migrate", complete: true }];
  const entries = buildChatTimeline(items, threads);
  assert.deepEqual(entries.map((entry) => entry.id), ["user", "thread-created:task"]);
  assert.deepEqual(entries[1], { kind: "notice", id: "thread-created:task", text: "Ada started “Migration”", workThreadId: "task" });
  assert.deepEqual(buildChatTimeline(items, threads), entries);
});

test("cyclic parent links do not duplicate work or loop forever", () => {
  const rows = [summary(conversation("a", { parentId: "b", bot: ada })), summary(conversation("b", { parentId: "a" }))];
  assert.deepEqual(buildChatWorkThreads(rows, "a", []).map((entry) => entry.id), ["b"]);
});


function workSummary(state: ConversationRun["state"]): ConversationSummary {
  const entry = summary(conversation(state, { parentId: "chat", bot: ada }));
  return { ...entry, latestRun: { id: `run-${state}`, state, createdAt: entry.conversation.createdAt, updatedAt: entry.conversation.updatedAt,
    failure: null } };
}

test("work phases distinguish pending, executing, completed and unsuccessful runs", () => {
  const cases: readonly [ConversationRun["state"], ChatWorkPhase][] = [
    ["queued", "pending"], ["starting", "in-progress"], ["running", "in-progress"], ["stopping", "in-progress"],
    ["awaiting-approval", "in-progress"], ["awaiting-input", "in-progress"], ["recovering", "in-progress"],
    ["completed", "completed"], ["failed", "attention"], ["interrupted", "attention"]
  ];
  for (const [state, phase] of cases) assert.equal(chatWorkPhase(workSummary(state)), phase, state);
  assert.equal(chatWorkPhase(summary(conversation("new"))), "pending");
  assert.equal(chatWorkPhase({ ...workSummary("completed"), queuedCount: 1 }), "pending");
  assert.equal(chatWorkPhase({ ...workSummary("completed"), pendingRequestCount: 1 }), "in-progress");
  assert.equal(chatWorkPhase({ ...workSummary("running"), queuedCount: 1 }), "in-progress");
});

test("the DM work groups retain completed and archived threads, with empty lifecycle sections available", () => {
  const done = workSummary("completed");
  done.conversation.archivedAt = "2026-11-20T12:00:00Z";
  const rows = [done, workSummary("queued"), workSummary("running"), workSummary("failed")];
  const threads = buildChatWorkThreads(rows, "chat", []);
  const groups = groupChatWorkThreads(threads);
  assert.deepEqual(groups.map((group) => [group.title, group.threads.map((thread) => thread.id)]), [
    ["In progress", ["running"]], ["Pending", ["queued"]], ["Needs attention", ["failed"]], ["Completed", ["completed"]]
  ]);
  assert.deepEqual(groupChatWorkThreads([]), [], "phases with no threads are left out");
});


test("the DM work groups show only the ten most recent completed threads and keep every unfinished thread", () => {
  const states = ["completed", "running", "queued", "failed"] as const;
  const summaries = states.flatMap((state) => Array.from({ length: 12 }, (_, index) => {
    const entry = workSummary(state);
    entry.conversation.id = `${state}-${index}`;
    entry.conversation.updatedAt = `2026-11-${String(index + 1).padStart(2, "0")}T12:00:00Z`;
    if (state === "completed") entry.conversation.archivedAt = entry.conversation.updatedAt;
    return entry;
  }));
  const threads = buildChatWorkThreads(summaries, "chat", []).reverse();
  const originalIds = threads.map((thread) => thread.id);
  const groups = groupChatWorkThreads(threads);
  assert.deepEqual(groups.find((group) => group.phase === "completed")?.threads.map((thread) => thread.id),
    Array.from({ length: 10 }, (_, index) => `completed-${11 - index}`));
  for (const group of groups.filter((group) => group.phase !== "completed")) {
    assert.equal(group.threads.length, 12, group.phase);
  }
  assert.deepEqual(threads.map((thread) => thread.id), originalIds);
});

test("the DM work panel hides chat execution parents while retaining their pending and completed workers", () => {
  const chat = conversation("dm", { direct: { botId: "ada", name: "Ada", role: "Helper", avatar: ada.avatar, scope: { kind: "global" }, workspaceId: "w" } });
  const parent = workSummary("running");
  parent.conversation.parentId = chat.id;
  const pending = workSummary("queued");
  pending.conversation.parentId = parent.conversation.id;
  pending.conversation.source = { kind: "worker" };
  const done = workSummary("completed");
  done.conversation.parentId = parent.conversation.id;
  done.conversation.source = { kind: "worker" };
  done.conversation.archivedAt = "2026-11-20T12:00:00Z";
  const rows = [summary(chat), parent, pending, done];
  const threads = buildBotWorkThreads(rows, "ada", chat.workspace.environmentId, []);
  assert.deepEqual(threads.map((thread) => thread.id).sort(), ["completed", "queued"]);
  assert.deepEqual(groupChatWorkThreads(threads).map((group) => [group.phase, group.threads.length]), [
    ["pending", 1], ["completed", 1]
  ]);
  assert.ok(buildChatWorkThreads(rows, chat.id, []).some((thread) => thread.id === parent.conversation.id), "the parent stays available to the chat's tabs");
});


test("DM rows preserve the selected model and allow settling only idle work with no queue", () => {
  const idle = summary(conversation("idle", { parentId: "chat" }));
  const completed = workSummary("completed");
  completed.conversation.provider.model = "different-model";
  const queued = workSummary("queued");
  const running = workSummary("running");
  const waiting = workSummary("completed");
  waiting.conversation.id = "waiting";
  waiting.pendingRequestCount = 1;
  const settled = workSummary("failed");
  settled.conversation.archivedAt = "2026-11-20T12:00:00Z";
  const rows = buildChatWorkThreads([idle, completed, queued, running, waiting, settled], "chat", []);
  assert.equal(rows.find((row) => row.id === "completed")?.model, "different-model");
  assert.equal(rows.find((row) => row.id === "completed")?.providerKind, completed.conversation.provider.kind);
  assert.deepEqual(rows.filter((row) => row.canSettle).map((row) => row.id).sort(), ["completed", "idle"]);
});


test("DM thread rows use their saved connection identities, with unknown for historical rows lacking metadata", () => {
  const before = summary(conversation("before", { parentId: "chat", provider: { ...conversation("base").provider, connection: "subscription" } }));
  const after = summary(conversation("after", { parentId: "chat", provider: { ...before.conversation.provider, connection: "api" } }));
  const legacy = summary(conversation("legacy", { parentId: "chat" }));
  const rows = buildChatWorkThreads([before, after, legacy], "chat", []);
  assert.deepEqual(rows.map((row) => [row.id, row.connection]), [["before", "subscription"], ["after", "api"], ["legacy", "unknown"]]);
});

test("settled workers without an instruction leave Pending while completed workers stay visible", () => {
  const empty = summary(conversation("empty", { parentId: "chat", source: { kind: "worker" }, archivedAt: "2026-11-20T12:00:00Z" }));
  const completed = workSummary("completed");
  completed.conversation.archivedAt = "2026-11-20T12:00:00Z";
  const groups = groupChatWorkThreads(buildChatWorkThreads([empty, completed], "chat", []));
  assert.equal(groups.some((group) => group.phase === "pending"), false, "an empty Pending phase is left out");
  assert.deepEqual(groups.find((group) => group.phase === "completed")?.threads.map((thread) => thread.id), ["completed"]);
});
