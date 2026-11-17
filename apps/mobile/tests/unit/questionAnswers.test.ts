import { describe, expect, it } from "vitest";
import type { QuestionRequest } from "@shared/types/conversation/contracts.types";
import { buildAnswers, emptyDraft, toggleOption } from "@/state/questionAnswers";
import { at } from "./fixtures/conversationFixtures";

const request: QuestionRequest = { id: "req", runId: "run", attemptId: "a", nativeId: "n", status: "pending", createdAt: at, expiresAt: at, title: "Choices",
  kind: "question", questions: [
    { id: "format", text: "Format?", options: ["PDF", "Slides"], multiple: false, allowOther: true },
    { id: "sections", text: "Sections?", options: ["Summary", "Budget"], multiple: true }
  ] };

describe("question answers", () => {
  it("requires every question to be answered", () => {
    expect(buildAnswers(request, emptyDraft(request))).toBeNull();
  });

  it("builds single, multiple and other answers keyed by question ID", () => {
    let draft = toggleOption(emptyDraft(request), "format", "PDF", false);
    draft = toggleOption(draft, "format", "Slides", false);
    draft = toggleOption(draft, "sections", "Summary", true);
    draft = toggleOption(draft, "sections", "Budget", true);
    expect(buildAnswers(request, draft)).toEqual({ format: ["Slides"], sections: ["Summary", "Budget"] });
    const withOther = { ...draft, format: { selected: ["Slides"], other: "  Word doc " } };
    expect(buildAnswers(request, withOther)).toEqual({ format: ["Word doc"], sections: ["Summary", "Budget"] });
  });
});
