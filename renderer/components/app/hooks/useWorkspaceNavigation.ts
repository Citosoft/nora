import { useContext } from "react";
import { WorkspaceNavigationContext } from "@/components/app/context/workspaceNavigationContext";
export function useWorkspaceNavigation() {
  const value = useContext(WorkspaceNavigationContext);
  if (!value) throw new Error("Workspace navigation requires its provider");
  return value;
}
