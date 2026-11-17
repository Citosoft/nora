import { describe, expect, it } from "vitest";
import { applyEvents, prependOlder, viewFromDetail } from "@/state/conversationViewState";
import { detail, event, message, run } from "./fixtures/conversationFixtures";

describe("conversation view wiring", () => {
  it("applies realtime events through the shared reducer and ignores replays", () => {
    const view = viewFromDetail(detail(10, [message("item-1", "Hel")]));
    const streamed = applyEvents(view, [
      event(11, { kind: "item", item: message("item-1", "Hello there") }),
      event(12, { kind: "run", run: run("run-2", "running") }),
      event(11, { kind: "item", item: message("item-1", "stale replay") })
    ]);
    expect(streamed.header.cursor).toBe(12);
    expect(streamed.items).toEqual([message("item-1", "Hello there")]);
    expect(streamed.header.activeRuns.map((entry) => entry.id)).toEqual(["run-2"]);

    const settled = applyEvents(streamed, [event(13, { kind: "run", run: run("run-2", "completed") })]);
    expect(settled.header.activeRuns).toEqual([]);
    expect(settled.runHistory.runs.map((entry) => entry.state)).toEqual(["completed"]);
  });

  it("ignores events for other conversations", () => {
    const view = viewFromDetail(detail(10));
    expect(applyEvents(view, [event(11, { kind: "item", item: message("x", "other") }, "conv-2")])).toBe(view);
  });

  it("prepends older history pages in front of the loaded window", () => {
    const view = viewFromDetail(detail(10, [message("item-3", "three")], 3));
    const older = prependOlder(view, { schemaVersion: 1, conversationId: "conv-1", cursor: 10, nextBefore: null, scope: "timeline",
      items: [message("item-1", "one"), message("item-2", "two")] });
    expect(older.items.map((item) => item.id)).toEqual(["item-1", "item-2", "item-3"]);
    expect(older.nextBefore).toBeNull();
  });
});
