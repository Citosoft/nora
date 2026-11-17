import { describe, expect, it } from "vitest";
import { filterByProject, filterConversations } from "@/state/conversationSearch";
import { titleFromInstruction } from "@/state/conversationTitle";
import { conversation, summary } from "./fixtures/conversationFixtures";

const summaries = [
  summary({ conversation: conversation("first", "Fix mobile chat layout") }),
  summary({ conversation: conversation("second", "Review CHAT permissions") }),
  summary({ conversation: conversation("third", "Plan the launch") })
];

describe("chat history search", () => {
  it("matches every search word without changing the runtime order", () => {
    expect(filterConversations(summaries, "  CHAT  ").map((item) => item.conversation.id)).toEqual(["first", "second"]);
    expect(filterConversations(summaries, "layout mobile").map((item) => item.conversation.id)).toEqual(["first"]);
  });
  it("retains all history for an empty search and returns no false matches", () => {
    expect(filterConversations(summaries, " \n ")).toEqual(summaries);
    expect(filterConversations(summaries, "chat launch")).toEqual([]);
  });
});

describe("sidebar project filter", () => {
  it("keeps only the chosen project's chats and returns everything for no project", () => {
    const other = summary({ conversation: { ...conversation("fourth", "Elsewhere"), workspace: { ...conversation().workspace, projectId: "proj-2" } } });
    const all = [...summaries, other];
    expect(filterByProject(all, "proj-2").map((item) => item.conversation.id)).toEqual(["fourth"]);
    expect(filterByProject(all, null)).toEqual(all);
  });
});

describe("automatic chat titles", () => {
  it("uses the first non-empty line and leaves the instruction untouched", () => {
    const instruction = "\n  Fix the mobile app  \n\nKeep the existing runtime.";
    expect(titleFromInstruction(instruction)).toBe("Fix the mobile app");
    expect(instruction).toContain("Keep the existing runtime.");
  });
  it("bounds titles and supplies a safe empty fallback", () => {
    expect(titleFromInstruction("a".repeat(240))).toHaveLength(200);
    expect(titleFromInstruction("\n  ")).toBe("New chat");
  });
});
