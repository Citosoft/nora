import { describe, expect, it } from "vitest";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import { dashboardHeadline, greeting, primaryRuntime, recentChats, sameReport } from "@/state/dashboard";
import { conversation, summary } from "./fixtures/conversationFixtures";

const computer = (installationId: string): RuntimeDirectoryEntry => ({
  installationId, name: installationId, environment: "desktop", hostname: `${installationId}.example.com`, tunnelId: "t", registeredAt: "2026-01-01T00:00:00.000Z"
});
const at = (hour: number) => new Date(2026, 10, 23, hour, 0, 0);

describe("greeting", () => {
  it("follows the time of day and uses the first name", () => {
    expect(greeting(at(8), "Sam Rivers")).toBe("Good morning, Sam");
    expect(greeting(at(14), "Sam")).toBe("Good afternoon, Sam");
    expect(greeting(at(21), null)).toBe("Good evening");
    expect(greeting(at(2), "  ")).toBe("Good evening");
  });
});

describe("primaryRuntime", () => {
  it("prefers the default computer, else the first", () => {
    const list = [computer("a"), computer("b")];
    expect(primaryRuntime(list, "b")?.installationId).toBe("b");
    expect(primaryRuntime(list, "gone")?.installationId).toBe("a");
    expect(primaryRuntime([], null)).toBeNull();
  });
});

describe("dashboardHeadline", () => {
  it("sums requests and running chats across online computers", () => {
    expect(dashboardHeadline({ a: { status: "online", needsYou: 1, working: 0 }, b: { status: "online", needsYou: 2, working: 1 }, c: { status: "offline" } }, 3))
      .toEqual({ text: "3 need you · 1 running", tone: "attention" });
    expect(dashboardHeadline({ a: { status: "online", needsYou: 1, working: 0 } }, 1).text).toBe("1 needs you");
    expect(dashboardHeadline({ a: { status: "online", needsYou: 0, working: 2 } }, 1)).toEqual({ text: "2 running", tone: "active" });
  });

  it("says when everything is calm, still checking, offline or missing", () => {
    expect(dashboardHeadline({ a: { status: "online", needsYou: 0, working: 0 } }, 1).tone).toBe("neutral");
    expect(dashboardHeadline({}, null).text).toBe("Finding your computers…");
    expect(dashboardHeadline({ a: { status: "checking" } }, 1).text).toBe("Checking your computers…");
    expect(dashboardHeadline({ a: { status: "offline" }, b: { status: "offline" } }, 2).text).toBe("Your computers are offline");
    expect(dashboardHeadline({}, 0).text).toBe("Connect a computer to get started");
  });
});

describe("recentChats", () => {
  it("leaves out bot direct chats and caps the list", () => {
    const direct = { ...conversation("bot"), direct: { botId: "b1", name: "Pixel", role: "Design critic", avatar: { seed: 1 }, scope: { kind: "global" as const }, workspaceId: "proj-1", retiredAt: null } };
    const list = [summary({ conversation: conversation("a") }), summary({ conversation: direct }), summary({ conversation: conversation("b") }),
      summary({ conversation: conversation("c") })];
    expect(recentChats(list, 2).map((item) => item.conversation.id)).toEqual(["a", "b"]);
  });
});

describe("sameReport", () => {
  it("compares status and counts", () => {
    expect(sameReport(undefined, { status: "checking" })).toBe(false);
    expect(sameReport({ status: "offline" }, { status: "offline" })).toBe(true);
    expect(sameReport({ status: "online", needsYou: 1, working: 0 }, { status: "online", needsYou: 1, working: 0 })).toBe(true);
    expect(sameReport({ status: "online", needsYou: 1, working: 0 }, { status: "online", needsYou: 2, working: 0 })).toBe(false);
  });
});
