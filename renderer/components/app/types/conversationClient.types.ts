import type { ExternalSessionsResult } from "@shared/types/conversation/externalSessions.types";
import type { CommandReceipt, ContextUsage, ConversationCommand, ConversationEvent, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery, OutputFileContent, OutputFileSize, OutputThread } from "@shared/types/conversation/queries.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { McpRequest, McpResult } from "@shared/types/provider/mcp.types";
import type { McpAppRequest, McpAppResult } from "@shared/types/provider/mcpApp.types";
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
  /** Every thread in a project with its output-bearing items, for the workspace Library. */
  outputs(projectId: string): Promise<OutputThread[]>;
  /** One of an item's output files, read for display at a size; null when the file is gone or unreadable. */
  outputFile(conversationId: string, itemId: string, path: string, size: OutputFileSize): Promise<OutputFileContent | null>;
  /** Opens one of an item's output files with the owning host's operating system. */
  openOutputFile(conversationId: string, itemId: string, path: string): Promise<void>;
  /** Discovers, refreshes or signs in to the MCP servers of one provider runtime. */
  mcp(request: McpRequest): Promise<McpResult>;
  mcpApp(request: McpAppRequest): Promise<McpAppResult>;
  /** Lists the skills one provider runtime offers in a checkout. */
  skills(request: SkillsRequest): Promise<SkillsResult>;
  /** Local cancellation is immediate; the native execution continues. */
  subscribe(listener: ConversationListener): () => void;
}
