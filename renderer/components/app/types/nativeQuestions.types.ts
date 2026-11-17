import type { RequestResponse, QuestionRequest, RequestQuestion } from "@shared/types/conversation/contracts.types";

export type { QuestionRequest, RequestQuestion, QuestionAnswers } from "@shared/types/conversation/contracts.types";

export interface NativeQuestionsProps {
  request: QuestionRequest;
  disabled: boolean;
  onRespond(response: RequestResponse): Promise<void>;
}

export interface NativeQuestionFieldProps {
  question: RequestQuestion;
  answers: readonly string[];
  disabled: boolean;
  onChange(answers: string[]): void;
}
