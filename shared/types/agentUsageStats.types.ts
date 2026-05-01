/** Worktree context passed from the renderer so usage can be attributed to Nora worktrees. */
export interface AgentUsageWorktreeInput {
  worktreeId: string;
  path: string;
  displayName: string;
}

export interface AgentUsageScanRequest {
  worktrees: AgentUsageWorktreeInput[];
}

/** Unified token bucket for UI (Claude cache read/write; Codex maps cached input into cacheRead). */
export interface AgentUsageTokenBucket {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface AgentUsageDailyRow {
  day: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningOutputTokens: number;
}

export interface AgentUsageWorktreeRow {
  worktreeId: string | null;
  projectLabel: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningOutputTokens: number;
}

export interface ClaudeLocalUsageStats {
  transcriptFilesScanned: number;
  totals: AgentUsageTokenBucket;
  recentDays: AgentUsageDailyRow[];
  topWorktrees: AgentUsageWorktreeRow[];
}

export interface CodexLocalUsageStats {
  sessionFilesScanned: number;
  totals: AgentUsageTokenBucket & {
    reasoningOutputTokens: number;
    totalTokens: number;
  };
  recentDays: AgentUsageDailyRow[];
  topWorktrees: AgentUsageWorktreeRow[];
}

export interface LocalAgentUsageReport {
  scannedAt: string;
  claude: ClaudeLocalUsageStats;
  codex: CodexLocalUsageStats;
}
