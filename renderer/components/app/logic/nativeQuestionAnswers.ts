import type { RequestQuestion } from "@shared/types/conversation/contracts.types";

export function selectQuestionOption(question: RequestQuestion, answers: readonly string[], option: string, selected: boolean): string[] {
  if (!question.options.includes(option)) return [...answers];
  if (!question.multiple) return selected ? [option] : [];
  const selectedOptions = new Set(answers);
  if (selected) selectedOptions.add(option);
  else selectedOptions.delete(option);
  return [...question.options.filter((entry) => selectedOptions.has(entry)),
    ...(question.allowOther ? answers.filter((entry) => !question.options.includes(entry)) : [])];
}

export function setOtherQuestionAnswer(question: RequestQuestion, answers: readonly string[], text: string): string[] {
  return [...(question.multiple ? answers.filter((entry) => question.options.includes(entry)) : []), text];
}

