import type { WorkspaceSidebarBuildDeps } from "@/components/app/types/workspaceSidebarBuild.types";
import type { WorkspaceUtilitiesInput } from "@/components/app/types/workspaceUtilities.types";
import type { BranchRequestReader } from "@/components/app/types/threadInsights.types";

/** Workspace sidebar region: full sidebar build deps (same shape as former `WorkspaceSidebarBuildProvider`). */
export type WorkspaceSidebarPorts = {
  sidebarBuild: WorkspaceSidebarBuildDeps;
  utilities: WorkspaceUtilitiesInput;
  readBranchRequest: BranchRequestReader;
  recentWorkspaces: import("@shared/appTypes").RecentProject[];
  onOpenRecentWorkspace(rootPath: string, name: string): void;
  onOpenConnectionsSettings(): void;
  onAddRemoteWorkspace(): void;
};
