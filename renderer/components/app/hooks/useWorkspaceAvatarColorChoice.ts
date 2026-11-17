import { useCallback } from "react";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { WorkspaceAvatarColorChoice } from "@/components/app/types/workspaceAvatar.types";

/** Reads and sets a workspace's initials avatar colour; null returns it to the automatic colour. */
export function useWorkspaceAvatarColorChoice(workspaceId: string): WorkspaceAvatarColorChoice {
  const { preferences, setPreferences } = useWorkspaceNavigation();
  const chooseColor = useCallback<WorkspaceAvatarColorChoice["chooseColor"]>((color) => setPreferences((current) => {
    const workspaceAvatarColors = { ...current.workspaceAvatarColors };
    if (color) workspaceAvatarColors[workspaceId] = color;
    else delete workspaceAvatarColors[workspaceId];
    return { ...current, workspaceAvatarColors };
  }), [setPreferences, workspaceId]);
  return { selectedColor: preferences.workspaceAvatarColors[workspaceId], chooseColor };
}
