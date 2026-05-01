export interface CodexLocalRawRecord {
  timestamp?: unknown;
  type?: unknown;
  payload?: Record<string, unknown>;
}

export interface CodexLocalParseContext {
  sessionId: string;
  sessionCwd: string | null;
  currentCwd: string | null;
  currentModel: string | null;
  previousTotals: CodexLocalRawUsage | null;
}

export interface CodexLocalRawUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
}
