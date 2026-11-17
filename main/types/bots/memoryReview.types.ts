import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { MemoryReviewActivity, MemoryReviewRecord } from "@shared/types/bots/memoryReview.types";
import type { TextGenerationRequest, TextGenerationResult } from "@main/types/ai/textGeneration.types";
import type { BotConversationHost } from "./conversations.types";
import type { BotMemoryStore } from "./memory.types";

/** One change a review proposes; `id`s refer to notes shown to it. */
export type MemoryReviewOperation =
  | { type: "add"; text: string; scope: "bot" | "workspace" }
  | { type: "update"; id: string; text: string }
  | { type: "forget"; id: string };

/** Everything a review prompt shows: whose notes they are, the notes that apply here, and the conversation since the last review. */
export interface MemoryReviewInput {
  owner: { name: string; role: string };
  notes: readonly BotMemoryEntry[];
  messages: readonly MemoryReviewMessage[];
}
export interface MemoryReviewMessage { role: "user" | "assistant"; text: string; createdAt: string; }

/** Where a review's changes land: the owner's notes in the reviewed thread's workspace, attributed to that thread. */
export interface MemoryReviewTarget { ownerId: string; workspaceId: string; conversationId: string; }
export interface MemoryReviewOutcome { added: number; updated: number; forgotten: number; skipped: number; }

export interface MemoryReviewSchedulerDeps {
  host: Pick<BotConversationHost, "header" | "conversationHistory" | "subscribe" | "eventCursor">;
  memory: BotMemoryStore;
  /** The memory review source and model chosen in Settings → AI. */
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>;
  /** Every review that calls a model is recorded, so background use of a subscription stays visible. */
  log: Pick<MemoryReviewLog, "record">;
  /** The configured source, recorded when a review fails before the source answers. */
  source(): { provider: string; model: string | null };
  /** Milliseconds, for review durations; defaults to Date.now. */
  clock?(): number;
  /** Read at each review, so turning the setting off stops reviews at once. */
  enabled(): boolean;
  /** Injected for tests; defaults to setTimeout. Returns a cancel function. */
  schedule?(callback: () => void, delayMs: number): () => void;
  onError(error: unknown): void;
}
export interface MemoryReviewScheduler {
  start(): void;
  /** Stops listening, cancels timers and aborts a review in flight. */
  stop(): void;
  /** Settles once queued reviews have finished; for tests and shutdown. */
  idle(): Promise<void>;
}

/** A durable record of background reviews: what each one cost and changed. */
export interface MemoryReviewLog {
  record(entry: Omit<MemoryReviewRecord, "id">): void;
  /** Totals since `since` and the newest `limit` records. */
  activity(since: string, limit: number): MemoryReviewActivity;
  close(): void;
}
