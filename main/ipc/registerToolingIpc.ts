import type {
  AgentSkillInstallOutputEvent,
  InstallAgentSkillPayload,
  InstallToolPayload,
  RemoveAgentSkillPayload,
  SaveToolConfigPayload
} from "@shared/appTypes";
import type { SavePastedImagePayload } from "@shared/types/agentInput.types";
import { ipcMain } from "electron";
import type { AppState } from "@shared/appTypes";
import type { MainServices } from "@main/services/mainServices";
import { savePastedImage } from "@main/pastedImages";

interface RegisterToolingIpcDeps {
  services: MainServices;
  withSnapshot: (action: () => Promise<AppState>) => Promise<AppState>;
  notifyToolSkillInstallOutput: (payload: AgentSkillInstallOutputEvent) => void;
}

export function registerToolingIpc({
  services,
  withSnapshot,
  notifyToolSkillInstallOutput
}: RegisterToolingIpcDeps): void {
  ipcMain.handle("app:install-tool", async (_event, payload: InstallToolPayload) => {
    console.log("[nora main] app:install-tool received", payload);
    try {
      const snapshot = await withSnapshot(() => services.tooling.installAgentTool(payload));
      console.log("[nora main] app:install-tool completed", {
        toolId: payload.toolId,
        action: payload.action
      });
      return snapshot;
    } catch (error) {
      console.error("[nora main] app:install-tool failed", {
        payload,
        error
      });
      throw error;
    }
  });
  ipcMain.handle("app:refresh-catalog", () => withSnapshot(() => services.tooling.refreshCatalog()));
  ipcMain.handle("app:search-tool-skills", (_event, toolId: string, query: string) =>
    services.tooling.searchToolSkills(toolId, query)
  );
  ipcMain.handle("app:install-tool-skill", (_event, payload: InstallAgentSkillPayload) =>
    withSnapshot(() =>
      services.tooling.installToolSkill(payload, (output) =>
        notifyToolSkillInstallOutput({
          toolId: payload.toolId,
          ...output
        })
      )
    )
  );
  ipcMain.handle("app:remove-tool-skill", (_event, payload: RemoveAgentSkillPayload) =>
    withSnapshot(() => services.tooling.removeToolSkill(payload))
  );
  ipcMain.handle("app:save-tool-config", (_event, payload: SaveToolConfigPayload) =>
    withSnapshot(() => services.tooling.saveToolConfig(payload))
  );
  ipcMain.handle("app:get-tool-usage", async (_event, toolId: string) => {
    console.log("[nora main] app:get-tool-usage received", { toolId });
    try {
      const result = await services.tooling.getToolUsage(toolId);
      console.log("[nora main] app:get-tool-usage resolved", {
        toolId,
        status: result?.status ?? null,
        lineCount: result?.lines.length ?? 0
      });
      return result;
    } catch (error) {
      console.error("[nora main] app:get-tool-usage failed", {
        toolId,
        error
      });
      throw error;
    }
  });
  ipcMain.handle("app:switch-tool-account", (_event, toolId: string) => services.tooling.switchToolAccount(toolId));
  ipcMain.handle("app:save-pasted-image", (_event, payload: SavePastedImagePayload) => savePastedImage(payload));
}
