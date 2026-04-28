import type { WorkspaceSidebarPorts } from "@/components/app/types/workspaceSidebarPorts.types";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";

const WorkspaceSidebarPortsContext = createContext<WorkspaceSidebarPorts | null>(null);

export const WorkspaceSidebarPortsProvider = ({
  value,
  children
}: {
  value: WorkspaceSidebarPorts;
  children: ReactNode;
}): ReactElement => (
  <WorkspaceSidebarPortsContext.Provider value={value}>{children}</WorkspaceSidebarPortsContext.Provider>
);

export const useOptionalWorkspaceSidebarPorts = (): WorkspaceSidebarPorts | null =>
  useContext(WorkspaceSidebarPortsContext);
