import { readdir } from "node:fs/promises";
import path from "node:path";
import { listSessions } from "@anthropic-ai/claude-agent-sdk";
import { claudeDesktopDirectory, readClaudeDesktopSessions } from "@main/providers/claude/desktopSessions";
import { listCodexRolloutFilePaths, readCodexRolloutSummary } from "@main/orchestrator/harness-context/codexAdapter";
import type { AgentHistoryLister } from "@main/types/app-import/agentHistory.types";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";

export const claudeHistoryListers: readonly AgentHistoryLister[] = [
  {
    async listPaths() {
      const sessions = await listSessions({ includeProgrammatic: false });
      return sessions.flatMap((session) => session.cwd ? [session.cwd] : []);
    }
  },
  {
    async listPaths() {
      const sessions = await readClaudeDesktopSessions(claudeDesktopDirectory());
      return sessions.filter((session) => !session.isArchived).map((session) => session.cwd);
    }
  }
];

export function codexSessionsDirectory(env: AppImportEnvironment): string {
  return path.join(env.variables.CODEX_HOME?.trim() || path.join(env.homeDir, ".codex"), "sessions");
}

export const codexHistoryListers: readonly AgentHistoryLister[] = [
  {
    async listPaths(env) {
      const root = codexSessionsDirectory(env);
      const available = await readdir(root).then(() => true, (error: unknown) => {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
        throw error;
      });
      if (!available) return [];
      const paths: string[] = [];
      // Read only session headers, one file at a time, without opening a runtime or loading transcripts.
      for (const file of await listCodexRolloutFilePaths(root)) {
        const summary = await readCodexRolloutSummary(file).catch(() => null);
        if (summary?.cwd) paths.push(summary.cwd);
      }
      return paths;
    }
  }
];
