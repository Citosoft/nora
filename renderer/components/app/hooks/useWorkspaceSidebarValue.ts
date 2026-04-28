import { createWorkspaceSidebarValue } from "@/components/app/context/workspaceSidebarContext";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/context/workspaceSidebarPortsContext";
import type { WorkspaceSidebarProps } from "@/components/app/types/workflow.types";
import type { WorkspaceSidebarBuildDeps } from "@/components/app/types/workspaceSidebarBuild.types";

/** Consumes full sidebar build deps; narrows in `createWorkspaceSidebarValue`. */
export function useWorkspaceSidebarValue(args?: WorkspaceSidebarBuildDeps): WorkspaceSidebarProps {
  const fromPort = useOptionalWorkspaceSidebarPorts()?.sidebarBuild;
  const resolved = args ?? fromPort;
  if (!resolved) {
    throw new Error("useWorkspaceSidebarValue requires args or WorkspaceSidebarPortsProvider.");
  }

  return createWorkspaceSidebarValue(resolved);
}
