import { describe, expect, it } from "vitest";
import { chatsOverview } from "@/state/chatsOverview";
import { conversation, run, summary } from "./fixtures/conversationFixtures";

describe("chat list shortcuts", () => {
  it("totals waiting requests and counts conversations whose agent is working", () => {
    const summaries = [
      summary({ conversation: conversation("a"), latestRun: run("r1", "running", "a") }),
      summary({ conversation: conversation("b"), latestRun: run("r2", "awaiting-approval", "b"), pendingRequestCount: 2 }),
      summary({ conversation: conversation("c"), latestRun: run("r3", "starting", "c") }),
      summary({ conversation: conversation("d"), latestRun: run("r4", "completed", "d") })
    ];
    expect(chatsOverview(summaries)).toEqual({ pendingRequests: 2, working: 2 });
  });
  it("is empty for no conversations", () => {
    expect(chatsOverview([])).toEqual({ pendingRequests: 0, working: 0 });
  });
});
