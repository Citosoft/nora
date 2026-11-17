import type { ToolingGateway } from "@shared/ipc/types/toolingGateway.types";

export type ToolingManagementGatewayDeps = Pick<
  ToolingGateway,
  | "refreshCatalog"
  | "checkProviderUpdates"
  | "installTool"
  | "removeTool"
  | "switchToolAccount"
  | "saveToolConfig"
  | "installToolSkill"
  | "removeToolSkill"
>;

export interface ToolingManagementClient {
  refreshToolCatalog(): ReturnType<ToolingGateway["refreshCatalog"]>;
  checkProviderUpdates: ToolingGateway["checkProviderUpdates"];
  installManagedTool: ToolingGateway["installTool"];
  removeManagedTool: ToolingGateway["removeTool"];
  switchManagedToolAccount(toolId: string): ReturnType<ToolingGateway["switchToolAccount"]>;
  saveManagedToolConfig: ToolingGateway["saveToolConfig"];
  installManagedToolSkill: ToolingGateway["installToolSkill"];
  removeManagedToolSkill: ToolingGateway["removeToolSkill"];
}
