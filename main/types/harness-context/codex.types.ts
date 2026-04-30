export interface CodexRolloutRecord {
  timestamp?: unknown;
  type?: unknown;
  payload?: unknown;
}

export interface CodexSessionMetaPayload {
  id?: unknown;
  timestamp?: unknown;
  cwd?: unknown;
}

export interface CodexEventMessagePayload {
  type?: unknown;
  message?: unknown;
  phase?: unknown;
}

export interface CodexRolloutSummary {
  sessionId: string | null;
  cwd: string | null;
  sessionStartedAtMs: number | null;
}
