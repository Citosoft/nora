import assert from "node:assert/strict";
import test from "node:test";
import { buildChatTimeline } from "@/components/app/logic/chatTimeline";
import { CHAT_TAB, chatTabThreads, resolveChatTab, startedDrafts } from "@/components/app/logic/chatTabs";
import { buildBranchTimeline } from "@/components/app/logic/chatBranchTimeline";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";

const ada = { kind: "bot" as const, botId: "ada", name: "Ada", avatar: { seed: 1 } };
const at = (minute: number): string => `2026-11-13T10:${String(minute).padStart(2, "0")}:00.000Z`;

test("a chat shows only messages and notices, grouping each author's bursts", () => {
  const items: TimelineItem[] = [
    { kind: "message", id: "u1", runId: "r1", createdAt: at(0), role: "user", text: "Hi", complete: true },
    { kind: "message", id: "u2", runId: "r1", createdAt: at(1), role: "user", text: "Fix the footer", complete: true },
    { kind: "tool", id: "t", runId: "r1", createdAt: at(1), label: "Ran tests", output: "", state: "completed" },
    { kind: "reasoning", id: "why", runId: "r1", createdAt: at(1), text: "thinking", complete: true },
    { kind: "message", id: "a1", runId: "r1", createdAt: at(2), role: "assistant", text: "On it", complete: true, author: ada, workThreadId: "task" },
    { kind: "message", id: "a2", runId: "r1", createdAt: at(20), role: "assistant", text: "Done", complete: true, author: ada },
    { kind: "milestone", id: "m", runId: "r2", createdAt: at(21), text: "Ada is waiting for you." },
    { kind: "message", id: "u3", runId: "r2", createdAt: at(21), role: "user", text: "  ", complete: true }
  ];
  const entries = buildChatTimeline(items);
  assert.deepEqual(entries.map((entry) => entry.kind === "message" ? [entry.id, entry.from, entry.continued] : [entry.id, "notice"]),
    [["u1", "user", false], ["u2", "user", true], ["a1", "bot", false], ["a2", "bot", false], ["m", "notice"]]);
  const reply = entries.find((entry) => entry.id === "a1");
  assert.equal(reply?.kind === "message" ? reply.workThreadId : null, "task");
});

test("chat tabs list open work threads oldest first, keep a settled one while selected, and fall back to the chat", () => {
  const thread = (id: string, createdAt: string, settled = false) => ({ id, botId: "ada", title: id, workspaceName: "App", working: false, waiting: false,
    settled, branch: null, createdAt, updatedAt: createdAt });
  const threads = [thread("newer", at(5)), thread("done", at(1), true), thread("older", at(2))];
  assert.deepEqual(chatTabThreads(threads, CHAT_TAB).map((entry) => entry.id), ["older", "newer"]);
  assert.deepEqual(chatTabThreads(threads, "done").map((entry) => entry.id), ["done", "older", "newer"]);
  const draft = { key: "branch:1", botId: "ada", from: null, threadId: null, title: null, naming: false };
  assert.equal(resolveChatTab(threads, [], "done"), "done");
  assert.equal(resolveChatTab(threads, [], "gone"), CHAT_TAB);
  assert.equal(resolveChatTab(threads, [draft], "branch:1"), "branch:1");
  // A draft hands over to its thread's tab only once that thread is listed.
  assert.deepEqual(startedDrafts([draft, { ...draft, key: "branch:2", threadId: "older" }, { ...draft, key: "branch:3", threadId: "unlisted" }], threads)
    .map((entry) => entry.key), ["branch:2"]);
});

test("a branch reads its work thread as a chat: the user's own words and the bot's latest message each turn", () => {
  const items: TimelineItem[] = [
    { kind: "message", id: "p1", runId: "r1", createdAt: at(0), role: "user", text: "You are Ada... The chat so far: ...", complete: true, chatText: "Fix the footer" },
    { kind: "message", id: "a1", runId: "r1", createdAt: at(1), role: "assistant", text: "Looking now", complete: true },
    { kind: "tool", id: "t", runId: "r1", createdAt: at(1), label: "Edited footer", output: "", state: "completed" },
    { kind: "message", id: "a2", runId: "r1", createdAt: at(2), role: "assistant", text: "Fixed it", complete: true },
    { kind: "message", id: "p2", runId: "r2", createdAt: at(3), role: "user", text: "Grace mentioned you: review this", complete: true },
    { kind: "message", id: "a3", runId: "r2", createdAt: at(4), role: "assistant", text: "Reviewed", complete: false }
  ];
  const entries = buildBranchTimeline(items, ada);
  assert.deepEqual(entries.map((entry) => entry.kind === "message" ? [entry.id, entry.from, entry.text, entry.author?.name ?? null] : [entry.id]),
    [["p1", "user", "Fix the footer", null], ["a2", "bot", "Fixed it", "Ada"], ["a3", "bot", "Reviewed", "Ada"]]);
});
