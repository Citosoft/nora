import type { WorkspaceSidebarBuildDeps } from "@/components/app/types/workspaceSidebarBuild.types";

/** Workspace sidebar region: full sidebar build deps (same shape as former `WorkspaceSidebarBuildProvider`). */
export type WorkspaceSidebarPorts = {
  sidebarBuild: WorkspaceSidebarBuildDeps;
};
