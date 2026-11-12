import type { ToolUsageInfo, ToolUsageWindow } from "@shared/appTypes";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";

/** Cached usage for one agent tool, shared by every surface that shows it. */
export interface ToolUsageEntry {
  info: ToolUsageInfo | null;
  loading: boolean;
  error: string | null;
  /** Epoch ms of the last settled load; null until one finishes. */
  loadedAt: number | null;
}

export type ToolUsageSnapshot = Readonly<Record<string, ToolUsageEntry>>;

export interface ToolUsageLoadOptions {
  /** Bypass the freshness window, e.g. for an explicit refresh. */
  force?: boolean;
}

export interface ToolUsageStore {
  getSnapshot(): ToolUsageSnapshot;
  subscribe(listener: () => void): () => void;
  load(toolId: string, options?: ToolUsageLoadOptions): Promise<void>;
}

export interface ToolUsageStoreDeps {
  fetchUsage(toolId: string): Promise<ToolUsageInfo | null>;
  now(): number;
  /** Loads within this age are reused so several surfaces never multiply provider requests. */
  maxAgeMs: number;
}

export type UsageTone = "normal" | "warning" | "critical";

export interface UsageRing {
  window: ToolUsageWindow;
  percentUsed: number;
  tone: UsageTone;
}

/** The two windows the composer donut draws: weekly on the outside, the ~5-hour session inside. */
export interface UsageRings {
  session: UsageRing | null;
  weekly: UsageRing | null;
}

export interface UsageWindowRowProps { window: ToolUsageWindow; }
export interface UsageSummaryGridProps { info: ToolUsageInfo; }
/** One filled arc of a ring gauge. */
export type GaugeRingValue = Pick<UsageRing, "percentUsed" | "tone">;
/** Concentric rings from the outside in; null draws an empty track. */
export interface RingGaugeProps { rings: ReadonlyArray<GaugeRingValue | null>; className?: string; }
export interface ProviderUsageWidgetProps { provider: NativeProvider | null; }
