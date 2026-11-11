import { useContext } from "react";
import { WorkspaceNavigationContext } from "@/components/app/context/workspaceNavigationContext";

export function useWorkspaceAvatarColor(workspaceId: string) {
  const navigation = useContext(WorkspaceNavigationContext);
  return navigation?.preferences.workspaceAvatarColors[workspaceId];
}
