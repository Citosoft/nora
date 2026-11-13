import type { ConversationRun } from "@shared/types/conversation/contracts.types";

export interface PreparedProviderTransition {
  cursor: number;
  handoff: NonNullable<ConversationRun["handoff"]>;
}
