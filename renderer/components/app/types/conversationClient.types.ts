import type { CommandReceipt, ConversationCommand, ConversationEvent, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery } from "@shared/types/conversation/queries.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";

export interface ConversationListener {
  after: number;
  conversationId?: string;
  onEvent: (event: ConversationEvent) => void;
  onError: (error: Error) => void;
}
export interface ConversationClient {
  execute(command: ConversationCommand): Promise<CommandReceipt>;
  header(conversationId: string): Promise<ConversationHeader | null>;
  summaries(projectId?: string): Promise<ConversationSummary[]>;
  history(query: HistoryQuery): Promise<ConversationHistoryPage>;
  catalog(kind: ProviderBinding["kind"], instanceId: string, workspace: WorkspaceRef): Promise<ProviderCatalogResult>;
  /** Local cancellation is immediate; the native execution continues. */
  subscribe(listener: ConversationListener): () => void;
}
