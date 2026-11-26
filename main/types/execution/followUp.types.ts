import type { ProviderBinding } from "@shared/types/conversation/contracts.types";

/** A turn a native runtime started by itself, such as reporting a background task that finished. */
export interface ProviderFollowUp {
  conversationId: string;
  provider: Pick<ProviderBinding, "kind" | "instanceId">;
  /** The native session the turn belongs to; a conversation that has moved on to another session ignores it. */
  nativeConversationId: string;
  /** Unique per follow-up; it becomes the run ID, so a repeated report is applied once. */
  followUpId: string;
  /** Shown as the run's opening milestone, for example "Background task finished: Wait for the build". */
  summary: string;
}

/** Whether the host queued a run for the follow-up; a refused one is discarded by the provider. */
export type FollowUpListener = (followUp: ProviderFollowUp) => boolean;

/** Providers whose runtime can start turns on its own expose this, so the host can turn each one into a run. */
export interface ProviderFollowUpSource {
  subscribe(listener: FollowUpListener): () => void;
}
