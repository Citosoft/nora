import type { IpcMain } from "electron";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { EventSubscription } from "@main/types/execution/engine.types";
import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { AppSettings } from "@shared/types/system.types";
import type {
  AnalyticsConsentStatus, AnalyticsEnvironment, AnalyticsErrorSource, AnalyticsEvent, AnalyticsLevel, AnalyticsPropertyValue, AnalyticsRuntimeConfig, PostHogConfig
} from "@shared/types/analytics.types";

export interface AnalyticsPolicyInput {
  runtimeAllowed: boolean;
  configured: boolean;
  usageStatisticsEnabled: boolean;
  consentStatus: AnalyticsConsentStatus;
  consentRequired: boolean;
}

export interface InstallationIdentity {
  installationId: string;
  isFirstLaunch: boolean;
}

/** Coarse context added to every event. Nothing here identifies a person or a machine on its own. */
export interface AnalyticsContext {
  appVersion: string;
  environment: AnalyticsEnvironment;
  platform: string;
  arch: string;
  osVersion: string;
  countryCode: string | null;
  locale: string | null;
}

export interface QueuedAnalyticsEvent {
  uuid: string;
  event: string;
  timestamp: string;
  properties: Record<string, AnalyticsPropertyValue>;
}

export interface AnalyticsTransport {
  enqueue(event: QueuedAnalyticsEvent): void;
  /** Drop everything not yet sent, e.g. when the user turns analytics off. */
  clear(): void;
  pending(): number;
  /** Resolves true when everything queued was delivered. */
  flush(): Promise<boolean>;
}

export interface AnalyticsTransportOptions {
  config: PostHogConfig;
  fetch?: typeof globalThis.fetch;
  maxQueued?: number;
  maxBatch?: number;
}

export interface AnalyticsRecorderDeps {
  transport: AnalyticsTransport;
  context: AnalyticsContext;
  getLevel: () => AnalyticsLevel;
  getInstallation: () => InstallationIdentity | null;
  sessionId: string;
  now?: () => Date;
  nextId?: () => string;
}

export interface AnalyticsRecorder {
  record(event: AnalyticsEvent): void;
  /** Call after the level changes; discards queued events the new level no longer allows. */
  levelChanged(): void;
  flush(): Promise<boolean>;
}

export interface RunAnalyticsDeps {
  record: (event: AnalyticsEvent) => void;
  conversation: (conversationId: string) => Conversation | null;
}

/** Per-run counts gathered while a run is live; item and request IDs dedupe repeated streaming updates. */
export interface RunTally {
  started: boolean;
  tools: Set<string>;
  failedTools: Set<string>;
  subagents: Set<string>;
  questions: Set<string>;
  approvals: Set<string>;
}

export interface FeatureUsageTally {
  count: number;
  failures: number;
  durations: number[];
}

export interface AnalyticsInventorySources {
  boot: NativeBoot;
  settings: AppSettings;
  connectors: ReadonlyArray<{ status: string }>;
  apps: number;
  threads: { total: number; archived: number };
}

export interface AnalyticsServiceDeps {
  config: PostHogConfig;
  statePath: string;
  context: AnalyticsContext;
  /** False in development unless analytics was switched on for the run. */
  runtimeAllowed: boolean;
  readSettings: () => AppSettings;
  log: (message: string) => void;
  fetch?: typeof globalThis.fetch;
}

/** The slice of the execution host analytics follows; it only reads run state, never instructions or output. */
export interface AnalyticsRunSource {
  subscribe(input: EventSubscription): () => void;
  eventCursor(): number;
  header(conversationId: string): { conversation: Conversation } | null;
}

export interface AnalyticsService {
  runtimeConfig: { usageStatisticsRequireConsent: boolean };
  instrumentIpc(ipc: IpcMain): void;
  start(): Promise<void>;
  settingsSaved(previous: AppSettings, next: AppSettings): Promise<void>;
  observeRuns(host: AnalyticsRunSource): () => void;
  reportInventory(read: () => AnalyticsInventorySources): void;
  recordError(source: AnalyticsErrorSource, error: unknown, context: string | null): void;
  recordFromRenderer(input: unknown): void;
  shutdown(): Promise<void>;
}

export interface AnalyticsIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input?: unknown) => unknown): void;
    removeHandler(channel: string): void;
  };
  runtimeConfig: AnalyticsRuntimeConfig;
  isAllowedSender(event: ConversationInvocation): boolean;
  record(input: unknown): void;
}

export interface DesktopAnalyticsOptions {
  /** The compiled main-process directory (`__dirname` of main.js); runtime config sits beside it. */
  distDirectory: string;
  isDevelopmentMode: boolean;
  runtimeAllowed: boolean;
  readSettings: () => AppSettings;
}
