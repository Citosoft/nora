import type { QuestionAnswers, QuestionRequest } from "@shared/types/conversation/contracts.types";
import type { QuestionDraft } from "@/types/questionDraft.types";

export function emptyDraft(request: QuestionRequest): QuestionDraft {
  return Object.fromEntries(request.questions.map((question) => [question.id, { selected: [], other: "" }]));
}

export function toggleOption(draft: QuestionDraft, questionId: string, option: string, multiple: boolean): QuestionDraft {
  const current = draft[questionId] ?? { selected: [], other: "" };
  const selected = current.selected.includes(option)
    ? current.selected.filter((value) => value !== option)
    : multiple ? [...current.selected, option] : [option];
  return { ...draft, [questionId]: { ...current, selected } };
}

/** The answers payload, or null while any question is unanswered. "Other" text is added as an extra answer. */
export function buildAnswers(request: QuestionRequest, draft: QuestionDraft): QuestionAnswers | null {
  const answers: QuestionAnswers = {};
  for (const question of request.questions) {
    const entry = draft[question.id] ?? { selected: [], other: "" };
    const other = question.allowOther || question.options.length === 0 ? entry.other.trim() : "";
    const values = question.multiple ? [...entry.selected, ...(other ? [other] : [])] : other ? [other] : entry.selected.slice(0, 1);
    if (!values.length) return null;
    answers[question.id] = values;
  }
  return answers;
}
