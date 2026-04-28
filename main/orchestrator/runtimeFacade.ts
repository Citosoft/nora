import type { AgentCatalogEntry, AgentToolConfig, TerminalShellOption, ToolUsageInfo } from "@shared/appTypes";
import { getInteractiveCodexStatus } from "./shell";

type ResolveTerminalShellDeps = {
  availableShells: TerminalShellOption[];
  shellId?: string;
  getShell: () => string;
};

export function resolveTerminalShellFromList({
  availableShells,
  shellId,
  getShell
}: ResolveTerminalShellDeps): TerminalShellOption {
  return (
    availableShells.find((shell) => shell.id === shellId) ||
    availableShells[0] || {
      id: "system",
      label: "System Shell",
      executable: getShell()
    }
  );
}

export function getToolEnvFromConfigs(
  toolConfigs: Record<string, AgentToolConfig>,
  toolId: string
): Record<string, string> {
  return toolConfigs[toolId]?.values || {};
}

type InteractiveCodexStatusDeps = {
  title: string;
  tool: AgentCatalogEntry;
  nowIso: () => string;
  getToolEnv: (toolId: string) => Record<string, string>;
};

export async function getInteractiveCodexStatusFromDeps({
  title,
  tool,
  nowIso,
  getToolEnv
}: InteractiveCodexStatusDeps): Promise<ToolUsageInfo> {
  return getInteractiveCodexStatus(title, tool, {
    nowIso,
    getToolEnv
  });
}

