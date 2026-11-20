import type { ConversationRun, ProviderBinding } from "@shared/types/conversation/contracts.types";

export interface PreparedProviderTransition {
  provider: ProviderBinding;
  cursor: number;
  handoff: NonNullable<ConversationRun["handoff"]>;
}
