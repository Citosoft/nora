import type { AgentCatalogEntry, ToolUsageInfo } from "@shared/appTypes";
import type { ClaudeUsageStatusInput } from "./agent-usage/claudeUsageLimits.types";
import type { CursorUsageStatusInput } from "./agent-usage/cursorUsage.types";
import type { CliStatusCapture } from "./agent-usage/toolUsageInfo.types";

export interface ToolStatusHelperDeps {
  nowIso: () => string;
  execFileAsync: (
    file: string,
    args: readonly string[],
    options: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      timeout?: number;
      maxBuffer?: number;
    }
  ) => Promise<{ stdout: string; stderr: string }>;
  getShell: () => string;
  getShellArgs: (command: string) => string[];
  getToolEnv: (toolId: string) => Record<string, string>;
  getExecStdout: (error: unknown) => string;
  getInteractiveCodexStatus: (tool: AgentCatalogEntry) => Promise<CliStatusCapture>;
  getClaudeUsageStatus: (input: ClaudeUsageStatusInput) => Promise<ToolUsageInfo>;
  getCursorUsageStatus: (input: CursorUsageStatusInput) => Promise<ToolUsageInfo>;
}

export interface ToolStatusHelpers {
  getToolStatusArgs: (toolId: string) => { title: string; args: string[] } | null;
  getCliToolStatus: (tool: AgentCatalogEntry) => Promise<ToolUsageInfo | null>;
}
