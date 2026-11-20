import assert from "node:assert/strict";
import test from "node:test";
import { buildChatThreadSummaries, clipSummaryText } from "@/components/app/logic/chatThreadSummaries";
import type { ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";

const at = (minute: number): string => `2026-11-20T10:${String(minute).padStart(2, "0")}:00.000Z`;
const run = (id: string, minute: number, patch: Partial<ConversationRun> = {}): ConversationRun => ({
  id, conversationId: "thread", instruction: "Coordinator: fix the footer\n\nContext follows", state: "completed", attemptId: "a",
  nativeTurnId: null, createdAt: at(minute), updatedAt: at(minute), failure: null, usage: null, review: "unavailable", ...patch
});

test("each turn says who asked, how it went, what it ran and changed, and its last reply", () => {
  const items: TimelineItem[] = [
    { kind: "message", id: "m1", runId: "r1", createdAt: at(1), role: "assistant", text: "Looking", complete: true },
    { kind: "tool", id: "t1", runId: "r1", createdAt: at(1), label: "Edit", output: "", state: "completed" },
    { kind: "tool", id: "t2", runId: "r1", createdAt: at(2), label: "Test", output: "", state: "failed" },
    { kind: "changes", id: "c1", runId: "r1", createdAt: at(2), paths: ["a.ts", "b.ts"], attribution: "turn" },
    { kind: "changes", id: "c2", runId: "r1", createdAt: at(2), paths: ["a.ts", "workspace.ts"], attribution: "workspace" },
    { kind: "message", id: "m2", runId: "r1", createdAt: at(3), role: "assistant", text: "Fixed the\nfooter.", complete: true }
  ];
  const [first, second] = buildChatThreadSummaries([run("r2", 5, { chatText: "Also the header", state: "running" }), run("r1", 0)], items);
  assert.deepEqual(first, { runId: "r1", at: at(0), request: { from: "chat", text: "Coordinator: fix the footer Context follows" },
    outcome: { kind: "done", label: "Done" }, endedAt: at(0), reply: { text: "Fixed the\nfooter.", at: at(3) }, tools: 2, failedTools: 1, files: ["a.ts", "b.ts"] });
  assert.deepEqual([second.request, second.outcome, second.endedAt, second.reply], [{ from: "you", text: "Also the header" }, { kind: "working", label: "Working" }, null, null]);
});

test("a run's live copy replaces its saved one, and a failure carries its reason", () => {
  const failure = { code: "provider" as const, message: "Rate limited", retryable: true };
  const turns = buildChatThreadSummaries([run("r1", 0, { state: "running" }), run("r1", 0, { state: "failed", failure })], []);
  assert.deepEqual(turns.map((turn) => turn.outcome), [{ kind: "failed", label: "Failed", detail: "Rate limited" }]);
});

test("summary text is one line, clipped with an ellipsis", () => {
  assert.equal(clipSummaryText("  a\n b  ", 10), "a b");
  assert.equal(clipSummaryText("abcdefghij", 5), "abcd…");
});
