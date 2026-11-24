import { describe, expect, it } from "vitest";
import type { TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";
import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import { TURN_WAITING_PHRASES } from "@shared/conversations/turnWaitingPhrases";
import { summarizeToolHistory } from "@shared/conversations/toolHistory";
import { buildTimelineEntries, timelineEntryKey } from "@/state/timelineEntries";
import { conversationTurnStatus } from "@/state/turnStatus";
import { at, header, message, run } from "./fixtures/conversationFixtures";

const tool = (id: string, state: ToolActivity["state"] = "completed", runId = "r"): ToolActivity =>
  ({ id, kind: "tool", runId, createdAt: at, label: id, state, output: "" });
const reasoning = (id: string, text: string, runId = "r"): TimelineItem =>
  ({ id, kind: "reasoning", runId, createdAt: at, text, complete: false });
function view(items: TimelineItem[] = [], state = run("r", "running").state): ConversationView {
  return { header: { ...header(1), activeRuns: [run("r", state)] }, items, nextBefore: null,
    runHistory: { runs: [], nextBefore: null } };
}

describe("mobile thread presentation", () => {
  it("keeps a single stable tool row through messages, reasoning, and streaming updates", () => {
    const before = buildTimelineEntries([tool("read", "running")]);
    const entries = buildTimelineEntries([tool("read"), message("reply", "Update", "r"), reasoning("thought", "Checking"), tool("test", "running")]);
    expect(entries.map(timelineEntryKey)).toEqual(["tools:r", "reply", "reasoning:thought"]);
    const group = entries[0];
    if (group?.kind !== "tools" || !before[0]) throw new Error("Expected tool group");
    expect(timelineEntryKey(group)).toBe(timelineEntryKey(before[0]));
    expect(group.items.map((item) => item.id)).toEqual(["read", "test"]);
    expect(summarizeToolHistory(group.items)).toMatchObject({ label: "test", count: 2, state: "running" });
    expect(summarizeToolHistory([tool("read"), tool("test", "failed")])).toMatchObject({ count: 2, state: "failed", failedCount: 1 });
  });

  it("keeps turns separate and merges only consecutive visible thinking", () => {
    const entries = buildTimelineEntries([
      tool("a"), reasoning("blank", " \n"), reasoning("one", "First"), tool("b"), reasoning("two", "Second"),
      message("reply", "Reply", "r"), reasoning("three", "Third"), tool("next", "running", "next-run")
    ]);
    expect(entries.map(timelineEntryKey)).toEqual(["tools:r", "reasoning:one", "reply", "reasoning:three", "tools:next-run"]);
    expect(entries[1]?.kind === "reasoning" && entries[1].items.map((item) => item.text)).toEqual(["First", "Second"]);
  });

  it("shows an orb for hidden thinking but no empty reasoning row", () => {
    const items = [reasoning("hidden", "   ")];
    expect(buildTimelineEntries(items)).toEqual([]);
    expect(conversationTurnStatus(view(items))).toEqual({ activity: { kind: "thinking", label: "Thinking…" }, label: "Thinking…" });
  });

  it("uses stable waiting phrases and ignores activity from older runs", () => {
    const waiting = conversationTurnStatus(view([tool("done")]));
    expect(waiting.activity?.kind).toBe("waiting");
    expect(TURN_WAITING_PHRASES.some((phrase) => waiting.label === `${phrase}…`)).toBe(true);
    expect(conversationTurnStatus(view([tool("done")]))).toEqual(waiting);
    expect(conversationTurnStatus(view([tool("search", "running", "old")])).activity?.kind).toBe("waiting");
    expect(conversationTurnStatus(view([{ ...tool("search", "running"), details: { category: "search" } }])).activity?.kind).toBe("searching");
    expect(conversationTurnStatus(view([message("reply", "Hello", "r")])).activity?.kind).toBe("composing");
  });

  it("stops animating while awaiting input and preserves queue and recovery labels", () => {
    for (const state of ["awaiting-input", "awaiting-approval", "recovering"] as const) {
      const status = conversationTurnStatus(view([tool("running", "running")], state));
      expect(status.activity).toBeNull();
      expect(status.label).toBeTruthy();
    }
    const idle = view();
    idle.header.activeRuns = [];
    expect(conversationTurnStatus(idle)).toEqual({ activity: null, label: null });
    idle.header.queuedRuns = [run("queued", "queued")];
    expect(conversationTurnStatus(idle)).toEqual({ activity: null, label: "1 queued" });
  });
});
