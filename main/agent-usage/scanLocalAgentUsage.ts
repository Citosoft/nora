import type { AgentUsageScanRequest, LocalAgentUsageReport } from "@shared/types/agentUsageStats.types";
import { scanClaudeLocalUsage } from "./claudeLocalUsageScan";
import { scanCodexLocalUsage } from "./codexLocalUsageScan";

export async function scanLocalAgentUsage(request: AgentUsageScanRequest): Promise<LocalAgentUsageReport> {
  const worktrees = request.worktrees ?? [];
  const [claude, codex] = await Promise.all([scanClaudeLocalUsage(worktrees), scanCodexLocalUsage(worktrees)]);

  return {
    scannedAt: new Date().toISOString(),
    claude,
    codex
  };
}
