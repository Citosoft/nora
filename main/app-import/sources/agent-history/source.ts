import { pathExists } from "@main/app-import/fileSystem";
import { appImportSourceDisplayName } from "@shared/app-import/sources";
import type { AppImportDetection } from "@shared/types/app-import/appImportSource.types";
import type { AgentHistorySourceOptions } from "@main/types/app-import/agentHistory.types";
import type { AppImportSource } from "@main/types/app-import/appImportSource.types";
import { historyWorkspaces } from "./projectRoots";

/**
 * Claude or Codex as an import source: only the project folders its sessions ran in. The sessions themselves
 * stay with the provider and are offered inside each Nora workspace, so nothing else is imported.
 */
export function createAgentHistorySource(options: AgentHistorySourceOptions): AppImportSource {
  const displayName = appImportSourceDisplayName(options.id);
  const detect: AppImportSource["detect"] = async (env) => {
    const searchedPaths = options.dataDirectories(env);
    for (const dataPath of searchedPaths) {
      if (await pathExists(dataPath)) return { status: "found", source: options.id, dataPath, format: { source: options.id, store: "sessionHistory" } } satisfies AppImportDetection;
    }
    return { status: "notFound", source: options.id, searchedPaths };
  };
  return {
    id: options.id,
    displayName,
    detect,
    async readPlan(context) {
      const detection = await detect(context.env);
      if (detection.status !== "found") return detection;
      const { workspaces, warnings } = await historyWorkspaces(options.id, options.listers, context.env);
      return { status: "ready", plan: { source: { id: options.id, displayName, dataPath: detection.dataPath, format: detection.format },
        workspaces, threads: [], setupScripts: [], terminalPresets: [], settings: [], keybindings: [], envVars: [], bots: [], skipped: [], warnings } };
    }
  };
}
