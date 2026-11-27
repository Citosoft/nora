import type { z } from "zod";
import type { effectSchema } from "@main/execution/effectSchema";
import type { Conversation, CommandReceipt, ConversationEvent, ConversationSnapshot, EventPayload, RuntimeRequest, TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery } from "@shared/types/conversation/queries.types";
import type { CheckpointRun, StoredCheckpoint } from "./checkpoints.types";

/** Only live/queued work and an explicitly selected run; historical transcript is loaded separately. */
export type ConversationState = Pick<ConversationSnapshot, "cursor" | "conversation" | "runs" | "requests" | "backgroundTasks">;
export interface ExecutionState extends ConversationState { items: TimelineItem[] }

export type ExecutionEffect = z.infer<typeof effectSchema>;
export interface StoredReceipt { key: string; fingerprint: string; receipt: CommandReceipt }
export interface StoreReader {
  snapshot(conversationId: string): ConversationSnapshot | null;
  snapshots(): ConversationSnapshot[];
  state(conversationId: string, runId?: string): ConversationState | null;
  activeStates(): ConversationState[];
  /** Pending tool or subagent activity across every saved turn, including work outliving its root turn. */
  hasBackgroundActivity(conversationId: string): boolean;
  execution(conversationId: string, runId: string): ExecutionState | null;
  item(conversationId: string, itemId: string): TimelineItem | null;
  request(conversationId: string, requestId: string): RuntimeRequest | null;
  checkpoint(conversationId: string, runId: string): StoredCheckpoint | null;
  /** Checkouts held by unfinished turn evidence or an undo in progress; later starts on them wait. */
  checkpointReservations(): WorkspaceRef[];
  /** Whether a turn kept an uninterrupted before/after pair, without hydrating file contents. */
  restorableCheckpoint(conversationId: string, runId: string): boolean;
  /** A conversation's checkpointed turns, newest first. */
  checkpointRuns(conversationId: string): CheckpointRun[];
  /** Verified bytes kept by any checkpoint, or null. */
  checkpointBlob(hash: string): Buffer | null;
  writers(workspace: WorkspaceRef): string[];
  maintenanceConversations(scope: "workers" | "claude" | "all"): Conversation[];
  summaries(projectId?: string): ConversationSummary[];
  /** The newest items in a project that can carry outputs: tool calls with output files and reviewed turns, oldest first. */
  outputItems(projectId: string, limit: number): { conversationId: string; item: TimelineItem }[];
  header(conversationId: string): ConversationHeader | null;
  history(query: HistoryQuery): ConversationHistoryPage;
  receipt(commandId: string): StoredReceipt | null;
  effect(id: string): ExecutionEffect | null;
  effects(): ExecutionEffect[];
  unfinishedEffects(): ExecutionEffect[];
  events(after: number, limit: number, conversationId?: string): ConversationEvent[];
  cursor(): number;
}
export interface StoreTransaction extends StoreReader {
  project(event: ConversationEvent): void;
  putReceipt(stored: StoredReceipt): void;
  putEffect(effect: ExecutionEffect): void;
  putCheckpoint(checkpoint: StoredCheckpoint): void;
  interruptCheckpoint(conversationId: string, runId: string): void;
  pinCheckpointBlobs(conversationId: string, runId: string, contents: readonly Uint8Array[]): void;
  deleteCheckpoint(conversationId: string, runId: string): void;
  appendEvent(id: string, conversationId: string, at: string, payload: EventPayload): ConversationEvent;
}
export interface ExecutionStore extends StoreReader {
  readonly environmentId: string;
  transaction<T>(work: (transaction: StoreTransaction) => T): T;
  close(): void;
}
