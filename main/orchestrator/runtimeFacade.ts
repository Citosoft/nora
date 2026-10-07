import type { AgentCatalogEntry, AgentToolConfig, TerminalShellOption } from "@shared/appTypes";
import type { CliStatusCapture } from "../types/agent-usage/toolUsageInfo.types";
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
  tool: AgentCatalogEntry;
  getToolEnv: (toolId: string) => Record<string, string>;
};

export async function getInteractiveCodexStatusFromDeps({
  tool,
  getToolEnv
}: InteractiveCodexStatusDeps): Promise<CliStatusCapture> {
  return getInteractiveCodexStatus(tool, { getToolEnv });
}

