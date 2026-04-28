import { noraToolingManagementClient } from "@/components/app/clients/noraToolingManagementClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type { ProjectSelectorScreenBuildDeps } from "@/components/app/types/projectSelectorScreenBuild.types";
import type { ProjectSelectorScreenProps } from "@/components/app/types/workflow.types";
import type { AppState } from "@shared/appTypes";

export const buildProjectSelectorScreenProps = (
  d: ProjectSelectorScreenBuildDeps,
  snapshot: AppState
): ProjectSelectorScreenProps => ({
  installCommandDrafts: d.installCommandDrafts,
  onChooseProject: () => {
    void d.openAddWorkspaceModal();
  },
  onSelectRecent: (projectRoot) => {
    void d.safely(() => noraWorkspaceClient.selectProject(projectRoot));
  },
  onRefreshCatalog: () => {
    void d.safely(() => noraToolingManagementClient.refreshToolCatalog());
  },
  onInstallDraftChange: d.setInstallCommandDraft,
  onInstallTool: (toolId) => {
    void d.safely(() => {
      const tool = snapshot.agentCatalog.find((item) => item.id === toolId);
      return noraToolingManagementClient.installManagedTool({
        toolId,
        action: "install",
        installCommand: d.resolveInstallCommand(toolId, tool?.installTemplate ?? "")
      });
    });
  },
  onRemoveTool: (toolId) => {
    void d.safely(() =>
      noraToolingManagementClient.removeManagedTool({
        toolId,
        action: "remove",
        installCommand: d.installCommandDrafts[toolId] ?? ""
      })
    );
  }
});
