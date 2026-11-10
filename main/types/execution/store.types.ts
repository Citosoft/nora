import type { z } from "zod";
import type { effectSchema } from "@main/execution/effectSchema";
import type { CommandReceipt, ConversationEvent, ConversationSnapshot, EventPayload, RuntimeRequest, TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery } from "@shared/types/conversation/queries.types";
import type { StoredCheckpoint } from "./checkpoints.types";

/** Only live/queued work and an explicitly selected run; historical transcript is loaded separately. */
export type ConversationState = Pick<ConversationSnapshot, "cursor" | "conversation" | "runs" | "requests">;
export interface ExecutionState extends ConversationState { items: TimelineItem[] }

export type ExecutionEffect = z.infer<typeof effectSchema>;
export interface StoredReceipt { key: string; fingerprint: string; receipt: CommandReceipt }
export interface StoreReader {
  snapshot(conversationId: string): ConversationSnapshot | null;
  snapshots(): ConversationSnapshot[];
  state(conversationId: string, runId?: string): ConversationState | null;
  activeStates(): ConversationState[];
  execution(conversationId: string, runId: string): ExecutionState | null;
  item(conversationId: string, itemId: string): TimelineItem | null;
  request(conversationId: string, requestId: string): RuntimeRequest | null;
  checkpoint(conversationId: string, runId: string): StoredCheckpoint | null;
  checkpointReservations(): WorkspaceRef[];
  writers(workspace: WorkspaceRef): string[];
  summaries(projectId?: string): ConversationSummary[];
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
  appendEvent(id: string, conversationId: string, at: string, payload: EventPayload): ConversationEvent;
}
export interface ExecutionStore extends StoreReader {
  readonly environmentId: string;
  transaction<T>(work: (transaction: StoreTransaction) => T): T;
  close(): void;
}
