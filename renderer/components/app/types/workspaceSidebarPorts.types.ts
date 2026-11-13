import type { WorkspaceSidebarBuildDeps } from "@/components/app/types/workspaceSidebarBuild.types";
import type { WorkspaceUtilitiesInput } from "@/components/app/types/workspaceUtilities.types";
import type { ThreadForgeClient } from "@/components/app/types/threadForge.types";

/** Workspace sidebar region: full sidebar build deps (same shape as former `WorkspaceSidebarBuildProvider`). */
export type WorkspaceSidebarPorts = {
  sidebarBuild: WorkspaceSidebarBuildDeps;
  utilities: WorkspaceUtilitiesInput;
  threadForge: ThreadForgeClient;
  recentWorkspaces: import("@shared/appTypes").RecentProject[];
  onOpenRecentWorkspace(rootPath: string, name: string): void;
  onOpenConnectionsSettings(): void;
  onAddRemoteWorkspace(): void;
};
