import type { AgentSkillInstallOutputEvent } from "@shared/appTypes";
import type { ToolingBridge } from "@shared/ipc/types/toolingGateway.types";

import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createToolingBridge(): ToolingBridge {
  return {
    refreshCatalog: () => invokeIpc("app:refresh-catalog"),
    installTool: async (payload) => {
      console.log("[nora preload] installTool invoke", payload);
      try {
        const result = await invokeIpc("app:install-tool", payload);
        console.log("[nora preload] installTool resolved", {
          toolId: payload.toolId,
          action: payload.action
        });
        return result;
      } catch (error) {
        console.error("[nora preload] installTool failed", {
          payload,
          error
        });
        throw error;
      }
    },
    removeTool: (payload) => invokeIpc("app:install-tool", payload),
    searchToolSkills: (toolId, query) => invokeIpc("app:search-tool-skills", toolId, query),
    installToolSkill: (payload) => invokeIpc("app:install-tool-skill", payload),
    removeToolSkill: (payload) => invokeIpc("app:remove-tool-skill", payload),
    saveToolConfig: (payload) => invokeIpc("app:save-tool-config", payload),
    getToolUsage: (toolId) => invokeIpc("app:get-tool-usage", toolId),
    switchToolAccount: (toolId) => invokeIpc("app:switch-tool-account", toolId),
    onToolSkillInstallOutput: (listener) =>
      subscribeToIpcEvent<AgentSkillInstallOutputEvent>("tool-skill-install:output", listener),
    listAiModels: (payload) => invokeIpc("app:list-ai-models", payload)
  };
}
