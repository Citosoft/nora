import type { CommandReceipt, ConversationCommand, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery } from "@shared/types/conversation/queries.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { EventSubscription } from "@main/types/execution/engine.types";

/** The narrow slice of the execution host that bot-to-bot work needs. */
export interface BotConversationHost {
  execute(command: ConversationCommand): Promise<CommandReceipt>;
  header(conversationId: string): ConversationHeader | null;
  summaries(): ConversationSummary[];
  conversationHistory(query: HistoryQuery): ConversationHistoryPage;
  subscribe(subscription: EventSubscription): () => void;
  eventCursor(): number;
  catalog(kind: ProviderBinding["kind"], instanceId: string, workspace: WorkspaceRef): Promise<ProviderCatalogResult>;
}
export interface BotRunnerDeps { host: BotConversationHost; nextId(): string; }
export interface BotReply {
  conversationId: string;
  status: "completed" | "failed" | "interrupted" | "timed-out";
  /** The run's final assistant message, when it wrote one. */
  text: string | null;
  failure: string | null;
}
export interface BotAskInput {
  conversationId: string;
  instruction: string;
  signal: AbortSignal;
  timeoutMs: number;
  /** Called once if the bot stops to wait for the user (an approval or question in its thread). */
  onWaiting?(): void;
}
