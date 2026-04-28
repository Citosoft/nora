import type { AppState } from "@shared/appTypes";

export const getWorkspacePresenceSignature = (snapshot: AppState | null): string => {
  if (!snapshot) {
    return "";
  }

  return [
    snapshot.project?.id || "",
    ...snapshot.workspaces.map((workspace) => workspace.project.id)
  ].join("\n");
};
