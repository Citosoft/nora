import assert from "node:assert/strict";
import test from "node:test";
import { buildChatTimeline } from "@/components/app/logic/chatTimeline";
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
