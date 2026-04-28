import type { WorkspaceRuntimeValue } from "@/components/app/types/workspaceRuntime.types";
import { createContext, useContext, type ReactNode } from "react";

const WorkspaceRuntimeContext = createContext<WorkspaceRuntimeValue | null>(null);

export const WorkspaceRuntimeProvider = ({
  value,
  children
}: {
  value: WorkspaceRuntimeValue;
  children: ReactNode;
}) => <WorkspaceRuntimeContext.Provider value={value}>{children}</WorkspaceRuntimeContext.Provider>;

export const useWorkspaceRuntime = (): WorkspaceRuntimeValue => {
  const context = useContext(WorkspaceRuntimeContext);
  if (!context) {
    throw new Error("useWorkspaceRuntime must be used within WorkspaceRuntimeProvider.");
  }

  return context;
};
