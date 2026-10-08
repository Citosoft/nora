export type ClaudeUsageLimitKind = "session" | "weekly";

/** One rate-limit window from Claude's OAuth usage endpoint, normalized across response shapes. */
export type ClaudeUsageLimit = {
  kind: ClaudeUsageLimitKind;
  /** Model name for model-scoped weekly windows (e.g. "Sonnet"); null for the all-models window. */
  scopeLabel: string | null;
  percentUsed: number;
  resetsAt: string | null;
  /** The endpoint's `severity`, e.g. "normal"; anything else is surfaced to the user. */
  severity: string | null;
};

export type ClaudeOAuthCredentials = {
  accessToken: string;
  expiresAtMs: number | null;
  subscriptionType: string | null;
};

export type ClaudeUsageStatusInput = {
  title: string;
  configDir: string;
  account: string | null;
  /** Auth hint lines shown above the limits in the transcript. */
  hintLines: string[];
  nowIso: () => string;
};
