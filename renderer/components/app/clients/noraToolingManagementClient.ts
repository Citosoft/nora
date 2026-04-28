import type {
  ToolingManagementClient,
  ToolingManagementGatewayDeps
} from "@/components/app/types/toolingManagementClient.types";

import { noraToolingClient } from "./noraToolingClient";

export function createToolingManagementClient(
  toolingGateway: ToolingManagementGatewayDeps
): ToolingManagementClient {
  return {
    refreshToolCatalog: () => toolingGateway.refreshCatalog(),
    installManagedTool: (payload) => toolingGateway.installTool(payload),
    removeManagedTool: (payload) => toolingGateway.removeTool(payload),
    switchManagedToolAccount: (toolId) => toolingGateway.switchToolAccount(toolId),
    saveManagedToolConfig: (payload) => toolingGateway.saveToolConfig(payload),
    installManagedToolSkill: (payload) => toolingGateway.installToolSkill(payload),
    removeManagedToolSkill: (payload) => toolingGateway.removeToolSkill(payload)
  };
}

export const noraToolingManagementClient = createToolingManagementClient(noraToolingClient);
