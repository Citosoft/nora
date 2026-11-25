import type { BotSnapshot } from "@shared/types/bots/bots.types";
import type { InitialInstruction, ChatBranch, ConversationEvent, ConversationSource } from "@shared/types/conversation/contracts.types";
import type { CommandReceipt, ConversationCommand, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery } from "@shared/types/conversation/queries.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { EventSubscription } from "@main/types/execution/engine.types";

/** The narrow slice of the execution host that bot-to-bot work needs. */
export interface BotConversationHost {
  execute(command: ConversationCommand, frozenBot?: BotSnapshot): Promise<CommandReceipt>;
  header(conversationId: string): ConversationHeader | null;
  summaries(): ConversationSummary[];
  conversationHistory(query: HistoryQuery): ConversationHistoryPage;
  subscribe(subscription: EventSubscription): () => void;
  eventCursor(): number;
  catalog(kind: ProviderBinding["kind"], instanceId: string, workspace: WorkspaceRef): Promise<ProviderCatalogResult>;
}
export interface BotRunnerDeps { host: BotConversationHost; nextId(): string; }
export interface BotThreadOptions { initialInstruction?: InitialInstruction; chatBranch?: ChatBranch; done?: string; ids?: { commandId: string; conversationId: string }; source?: ConversationSource; }
/** Watches a conversation's events after `after`; `settle` returns a value to stop watching, or undefined to keep going. */
export interface ConversationWatchInput<T> {
  conversationId: string;
  after: number;
  signal: AbortSignal;
  timeoutMs: number;
  settle(event: ConversationEvent): T | undefined;
}
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
  /** Let delegated work continue when the tool must return before its runtime deadline. */
  continueOnTimeout?: boolean;
  /** Pins a direct-chat message to one workspace for this run only. */
  workspaceId?: string;
  /** The user's own words behind `instruction`, shown in place of it when the thread is viewed as a chat. */
  chatText?: string;
  /** Called once if the bot stops to wait for the user (an approval or question in its thread). */
  onWaiting?(): void;
}
