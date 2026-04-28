import type { AgentCatalogEntry, ToolUsageInfo } from "@shared/appTypes";

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
  getInteractiveCodexStatus: (title: string, tool: AgentCatalogEntry) => Promise<ToolUsageInfo>;
}

export interface ToolStatusHelpers {
  getToolStatusArgs: (toolId: string) => { title: string; args: string[] } | null;
  getCliToolStatus: (tool: AgentCatalogEntry) => Promise<ToolUsageInfo | null>;
}
