import assert from "node:assert/strict";
import test from "node:test";
import { transcriptHistory } from "@main/app-import/apply/transcriptHistory";
import type { AppImportThread } from "@shared/types/app-import/appImportPlan.types";

const thread: AppImportThread = {
  importKey: "t3-code:thread:1", workspaceImportKey: "t3-code:workspace:1", title: "Fix login", provider: "claude", sourceProvider: "claudeAgent",
  cwd: "/repo", pinned: false, archived: false, createdAt: "2026-01-01T10:00:00.000Z", updatedAt: "2026-01-01T11:00:00.000Z", resumable: false,
  transcript: { completeness: "full", messages: [
    { role: "assistant", text: "Welcome back", createdAt: "2026-01-01T10:00:00.000Z" },
    { role: "user", text: "Fix the login bug", createdAt: "2026-01-01T10:01:00.000Z" },
    { role: "assistant", text: "Done.", createdAt: "not a date" },
    { role: "user", text: "   ", createdAt: "2026-01-01T10:03:00.000Z" },
    { role: "user", text: "Thanks", createdAt: "2026-01-01T10:04:00.000Z" }
  ] }
};

test("supplied transcripts become read-only history with one turn per user message", () => {
  const history = transcriptHistory(thread);
  assert.equal(history.nativeConversationId, null);
  assert.equal(history.title, "Fix login");
  assert.deepEqual(history.turns.map((turn) => [turn.instruction, turn.items.map((item) => item.kind === "message" ? `${item.role}:${item.text}` : item.kind)]), [
    ["Earlier messages", ["assistant:Welcome back"]],
    ["Fix the login bug", ["user:Fix the login bug", "assistant:Done."]],
    ["Thanks", ["user:Thanks"]]
  ]);
  assert.equal(history.turns[1]?.items[1]?.createdAt, thread.createdAt, "an unreadable time falls back to the thread's creation time");
  assert.deepEqual(transcriptHistory(thread), history, "ids are stable across runs");
});
