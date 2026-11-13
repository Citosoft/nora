import type { ExternalSessionsResult } from "@shared/types/conversation/externalSessions.types";
import type { CommandReceipt, ContextUsage, ConversationCommand, ConversationEvent, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery } from "@shared/types/conversation/queries.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { McpRequest, McpResult } from "@shared/types/provider/mcp.types";
import type { SkillsRequest, SkillsResult } from "@shared/types/provider/skills.types";
import type { ThreadReference } from "@shared/types/conversation/references.types";

export interface ConversationListener {
  after: number;
  conversationId?: string;
  onEvent: (event: ConversationEvent) => void;
  onError: (error: Error) => void;
}
export interface ConversationClient {
  reference(conversationId: string): Promise<ThreadReference>;
  externalSessions(kind: ProviderBinding["kind"], instanceId: string, workspace: WorkspaceRef): Promise<ExternalSessionsResult>;
  execute(command: ConversationCommand): Promise<CommandReceipt>;
  header(conversationId: string): Promise<ConversationHeader | null>;
  /** Measures a thread's context from saved history when it has no reading; the result also arrives as an event. */
  context(conversationId: string): Promise<ContextUsage | null>;
  summaries(projectId?: string): Promise<ConversationSummary[]>;
  history(query: HistoryQuery): Promise<ConversationHistoryPage>;
  catalog(kind: ProviderBinding["kind"], instanceId: string, workspace: WorkspaceRef): Promise<ProviderCatalogResult>;
  /** Discovers, refreshes or signs in to the MCP servers of one provider runtime. */
  mcp(request: McpRequest): Promise<McpResult>;
  /** Lists the skills one provider runtime offers in a checkout. */
  skills(request: SkillsRequest): Promise<SkillsResult>;
  /** Local cancellation is immediate; the native execution continues. */
  subscribe(listener: ConversationListener): () => void;
}
