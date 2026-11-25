import type { QuestionAnswers, RequestQuestion } from "@shared/types/conversation/contracts.types";

/** Choice questions always offer a typed Other answer; free-text-only questions use a plain text field instead. */
export function questionOffersOther(question: RequestQuestion): boolean {
  return question.options.length > 0;
}

/** The widget and command boundary must agree on which answers can be submitted. */
export function areQuestionAnswersComplete(questions: readonly RequestQuestion[], answers: QuestionAnswers): boolean {
  return questions.every((question) => {
    const values = answers[question.id] ?? [];
    return values.length > 0 && (question.multiple || values.length === 1)
      && values.every((value) => !!value.trim());
  });
}
