import { listSessions } from "@anthropic-ai/claude-agent-sdk";
import path from "node:path";
import os from "node:os";
import { readdir } from "node:fs/promises";
import { claudeDesktopDirectory, readClaudeDesktopSessions } from "@main/providers/claude/desktopSessions";
import { listCodexRolloutFilePaths, readCodexRolloutSummary } from "@main/orchestrator/harness-context/codexAdapter";
import type { WorkspaceHistorySource } from "@main/types/workspace-import/discovery.types";

export const workspaceHistorySources: readonly WorkspaceHistorySource[] = [
  {
    id: "claude",
    async listPaths() {
      const sessions = await listSessions({ includeProgrammatic: false });
      return sessions.flatMap((session) => session.cwd ? [session.cwd] : []);
    }
  },
  {
    id: "claude",
    async listPaths() {
      const sessions = await readClaudeDesktopSessions(claudeDesktopDirectory());
      return sessions.filter((session) => !session.isArchived).map((session) => session.cwd);
    }
  },
  {
    id: "codex",
    async listPaths() {
      const root = path.join(process.env.CODEX_HOME?.trim() || path.join(os.homedir(), ".codex"), "sessions");
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
