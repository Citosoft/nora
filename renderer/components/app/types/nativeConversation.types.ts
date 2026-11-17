import type { ConversationCommand, ConversationRun, ProviderBinding, ConversationSource } from "@shared/types/conversation/contracts.types";
import type { ConversationClient } from "./conversationClient.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import type { DirectRequest, GroupRequest } from "@shared/types/bots/bots.types";

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
  currentProvider?: ProviderBinding;
  source?: ConversationSource;
  conversationId: string | null;
  workspace: NativeWorkspace;
  provider: ProviderBinding;
  role: RoleSelection | null;
  group?: GroupRequest;
  /** A new direct chat: which bot, where new tasks start, and where the chat itself is stored. */
  direct?: { request: DirectRequest; title: string; home: NativeWorkspace };
  text: string;
}
