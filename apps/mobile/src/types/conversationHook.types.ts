import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import type { LoadState } from "./loadState.types";

export interface ConversationHandle {
  state: LoadState<ConversationView>;
  olderHistory: { loading: boolean; error: string | null };
  loadOlder(): void;
  refresh(): void;
}
