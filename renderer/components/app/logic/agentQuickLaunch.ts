import { isAgentToolAvailable } from "@shared/agentToolState";
import type { AgentCatalogEntry, AppSettings, CreateAgentPayload } from "@shared/appTypes";

/** The default harness: the preferred tool when it is usable, otherwise the first usable tool. */
export function resolveDefaultAgentTool<T extends Pick<AgentCatalogEntry, "id" | "detected" | "enabled">>(
  catalog: readonly T[],
  preferredAgentToolId: AppSettings["preferredAgentToolId"]
): T | null {
  const availableTools = catalog.filter((tool) => isAgentToolAvailable(tool));
  return availableTools.find((tool) => tool.id === preferredAgentToolId) ?? availableTools[0] ?? null;
}

/** One-click launch: no task or prompt, in the project folder at its existing checkout (never a new worktree). */
export function createQuickAgentPayload(toolId: string): CreateAgentPayload {
  return {
    toolId,
    name: "",
    task: "",
    commandOverride: "",
    mode: "write",
    target: { kind: "root" },
    contextSelections: [],
    launchSource: "dialog",
    branchCheckout: null,
    worktreeBranch: null,
    prepareWorktree: false,
    prepareCommand: ""
  };
}
