export type AnalyticsEnvironment = "production" | "development";
/** The answer to the opt-in prompt for detailed analytics. */
export type AnalyticsConsentStatus = "unknown" | "granted" | "declined";

/**
 * How much Nora may send for this run.
 * - `anonymous`: counts tied to a random installation ID only (no account, no IP, no free text). Sent without opt-in where
 *   the user's region allows statistical analytics on an opt-out basis, and always stoppable in Settings.
 * - `detailed`: everything in `anonymous` plus richer, still non-identifying, context. Only after explicit opt-in.
 */
export type AnalyticsTier = "anonymous" | "detailed";
export type AnalyticsLevel = "off" | AnalyticsTier;

export interface AnalyticsPreferences {
  analyticsConsentStatus: AnalyticsConsentStatus;
  usageStatisticsEnabled: boolean;
}
export type AnalyticsPreferencesPatch = Partial<AnalyticsPreferences>;

export interface PostHogConfig {
  apiKey: string;
}

export interface AnalyticsRuntimeConfig {
  isDevelopmentMode: boolean;
  devModeAnalyticsSwitch: string;
  devModeAnalyticsEnabled: boolean;
  analyticsAllowedInCurrentRun: boolean;
  /** True where the user's region needs opt-in even for anonymous statistics (EEA, Switzerland or an unknown region). */
  usageStatisticsRequireConsent: boolean;
}

export type AnalyticsPropertyValue = string | number | boolean | null;

/** A user stop ends as `interrupted`; the engine has no separate cancelled state. */
export type TurnOutcome = "completed" | "failed" | "interrupted";

/** Where an error was observed. Messages are only attached in the detailed tier, after scrubbing. */
export type AnalyticsErrorSource = "main" | "renderer" | "ipc" | "turn";

export type AgentCreationSource = "task-panel" | "task-reference" | "task-planner" | "dialog" | "forge-issue" | "shortcut";

/**
 * Every event Nora can send, keyed by name. Properties are flat primitives so free text, paths and payloads cannot slip in
 * by accident; any new event must be added here and to `ANALYTICS_EVENT_TIERS`.
 */
export interface AnalyticsEventMap {
  "app.launched": { isFirstLaunch: boolean };
  "app.session_ended": { durationSeconds: number };
  /** Aggregated IPC use per feature action since the last flush. */
  "feature.used": { feature: string; action: string; count: number; failures: number; p50DurationMs: number; maxDurationMs: number };
  "thread.created": { origin: string; provider: string; model: string | null };
  "turn.started": { provider: string; model: string | null; effort: string | null; connection: string; origin: string; action: string };
  "turn.finished": {
    provider: string; model: string | null; effort: string | null; connection: string; origin: string; action: string;
    outcome: TurnOutcome; durationMs: number | null; failureCode: string | null; retryable: boolean | null;
    inputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null;
    toolCalls: number; toolFailures: number; subagents: number; questions: number; approvals: number;
  };
  "error.occurred": {
    source: AnalyticsErrorSource; errorName: string; errorCode: string | null; context: string | null;
    /** Detailed tier only, scrubbed of paths, URLs, emails and secrets. */
    message?: string; stack?: string;
  };
  /** A daily count of what the installation has configured. Counts only, never names. */
  "inventory.reported": Record<string, number | string | boolean>;
  "settings.changed": { setting: string; value: string | number | boolean | null };
  // Renderer-originated, detailed tier only.
  "view.opened": { view: string };
  "agent.created": { toolId: string; mode: string; targetKind: string; via: AgentCreationSource; hasTask: boolean; workspaceCount: number };
  "workspace.focused": { kind: string; workspaceCount: number };
  "command.invoked": { command: string; via: "keybinding" | "menu" };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export type AnalyticsEvent = { [Name in AnalyticsEventName]: { name: Name; properties: AnalyticsEventMap[Name] } }[AnalyticsEventName];

/** Events the window may send over IPC; everything else is recorded by the main process itself. */
export type RendererAnalyticsEventName = "view.opened" | "agent.created" | "workspace.focused" | "command.invoked" | "error.occurred";
export type RendererAnalyticsEvent = Extract<AnalyticsEvent, { name: RendererAnalyticsEventName }>;
