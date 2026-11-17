import type { ContextUsage } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";
import type { ConversationClient } from "./conversationClient.types";
import type { GaugeRingValue } from "./toolUsage.types";

export interface ContextGauge extends GaugeRingValue {
  remainingTokens: number;
}

export type ContextCompactionState = "available" | "compacting" | "blocked";

export interface ContextCompaction {
  state: ContextCompactionState;
  onCompact(): void;
}

export interface ContextUsageWidgetProps {
  /** Undefined before the first measurement; null when compaction left it unknown until the next response. */
  context: ContextUsage | null | undefined;
  /** Absent when the provider cannot compact. */
  compaction: ContextCompaction | null;
}

export interface ThreadContextUsageProps {
  /** Null for a new thread that has not been created yet. */
  header: ConversationHeader | null;
  capabilities: ProviderCapabilities | null;
  /** True when nothing blocks a new run: no submission in flight, unsent retry, or settled thread. */
  ready: boolean;
  compact(): Promise<void>;
  client: Pick<ConversationClient, "context">;
}
