import type { TimelineItem, ConversationCommand, ConversationRun, ProviderBinding, ConversationSource } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { ConversationClient } from "./conversationClient.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { RoleSelection } from "@shared/types/personalization/roles.types";

export interface NativeConversationView {
  header: ConversationHeader;
  items: TimelineItem[];
  nextBefore: number | null;
  runHistory: NativeRunHistory;
}
export interface NativeRunHistory { runs: ConversationRun[]; nextBefore: number | null; }
export interface NativeTurnTimeProps { run: ConversationRun; startedAt: string; }
export interface NativeConversationDeps {
  client: ConversationClient;
  conversationId: string | null;
}
export interface NativeDraftIntent {
  create: Extract<ConversationCommand, { kind: "create" }> | null;
  submit: Extract<ConversationCommand, { kind: "submit" }>;
}
export interface NativeDraftInput {
  source?: ConversationSource;
  conversationId: string | null;
  workspace: NativeWorkspace;
  provider: ProviderBinding;
  role: RoleSelection | null;
  text: string;
}
