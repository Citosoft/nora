import type { ProjectSummary } from "@shared/appTypes";
import { isGitProject } from "@shared/projectVersionControl";
import { availableWorkspaceTools } from "@/components/app/logic/workspace-navigation/tools";
import type { WorkspaceToolRoute } from "@/components/app/types/workspaceNavigation.types";

export function resolveWorkspaceToolRoute(route: WorkspaceToolRoute | null, projectId: string | null, focusRevision: number, project?: ProjectSummary | null): WorkspaceToolRoute | null {
  if (!route || route.projectId !== projectId || route.focusRevision !== focusRevision) return null;
  return project && availableWorkspaceTools(isGitProject(project)).includes(route.tool) ? route : null;
}
