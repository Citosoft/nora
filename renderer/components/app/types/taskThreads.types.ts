import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ProviderConnectionKind } from "@shared/types/provider/account.types";

/** A thread started for a task that is currently working on it, as the task surfaces show it. */
export interface ActiveTaskThread {
  id: string;
  title: string;
  providerKind: ProviderBinding["kind"];
  connection: ProviderConnectionKind;
  model: string;
  /** True while the thread waits for the user (an approval or a question) rather than working. */
  waiting: boolean;
  updatedAt: string;
}

/** The newest active thread per task, keyed by `taskThreadKey`. */
export type ActiveTaskThreads = ReadonlyMap<string, ActiveTaskThread>;

export interface TaskThreadIndicatorProps {
  thread: ActiveTaskThread;
  onOpenThread: (conversationId: string) => void;
  /** `labelled` adds the model name beside the logo, for roomier surfaces like the task editor. */
  variant?: "compact" | "labelled";
}
