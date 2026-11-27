import type { BackgroundTask } from "@shared/types/conversation/contracts.types";

/** A provider's current non-ambient background work for one conversation; full replace each time. */
export interface ProviderBackgroundTasks {
  conversationId: string;
  tasks: BackgroundTask[];
}

export type BackgroundTasksListener = (update: ProviderBackgroundTasks) => void;

/** Providers that keep work running between turns expose this so the host can mirror it on the thread. */
export interface ProviderBackgroundTasksSource {
  subscribe(listener: BackgroundTasksListener): () => void;
}
