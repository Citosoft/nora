import type { SecretInputPrompt, SecretPrompt, SecretPromptAnswer, SecretUsePrompt } from "@shared/types/secrets/secrets.types";

export type AnswerSecretPrompt = (answer: SecretPromptAnswer) => Promise<void>;
export interface SecretPromptsState {
  /** The prompts this thread may answer, oldest first. */
  prompts: readonly SecretPrompt[];
  answer: AnswerSecretPrompt;
}
export interface SecretAnswerState {
  /** The kind of answer being delivered, to mark its button busy. */
  sending: SecretPromptAnswer["kind"] | null;
  error: string | null;
  /** Resolves true once main accepted the answer; a failure is kept in `error` so the user can retry. */
  send(answer: SecretPromptAnswer): Promise<boolean>;
}
export interface SecretPromptStackProps { conversationId: string; }
export interface SecretInputCardProps { prompt: SecretInputPrompt; onAnswer: AnswerSecretPrompt; }
export interface SecretUseCardProps { prompt: SecretUsePrompt; onAnswer: AnswerSecretPrompt; }
