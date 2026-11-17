export type GenerateThreadName = (instruction: string, signal: AbortSignal) => Promise<string>;
export interface ConversationNamingDeps {
  generate: GenerateThreadName;
  apply(conversationId: string, expectedTitle: string, title: string): void;
}
