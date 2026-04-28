import type { AppState } from "@shared/appTypes";

export function getWorkspaceProjectIds(snapshot: AppState | null): string[] {
  if (!snapshot) {
    return [];
  }

  return Array.from(
    new Set([
      ...(snapshot.project ? [snapshot.project.id] : []),
      ...snapshot.workspaces.map((workspace) => workspace.project.id)
    ])
  );
}
