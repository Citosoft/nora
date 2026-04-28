import { useOptionalWorkspaceSidebarPorts } from "@/components/app/context/workspaceSidebarPortsContext";
import type { WorkspaceSidebarPorts } from "@/components/app/types/workspaceSidebarPorts.types";

export const useWorkspaceSidebarPorts = (): WorkspaceSidebarPorts => {
  const v = useOptionalWorkspaceSidebarPorts();
  if (!v) {
    throw new Error("useWorkspaceSidebarPorts must be used within WorkspaceSidebarPortsProvider.");
  }
  return v;
};
