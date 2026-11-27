import { availableWorkspaceTools } from "@/components/app/logic/workspace-navigation/tools";
import type { NavigationShortcutTarget, NavigationShortcutTargets } from "@/components/app/types/workspaceNavigation.types";

export const NAVIGATION_SHORTCUT_TARGETS: NavigationShortcutTargets = {
  "show-inbox": { kind: "sidebar-mode", mode: "inbox" },
  "show-threads": { kind: "sidebar-mode", mode: "threads" },
  "show-bots": { kind: "sidebar-mode", mode: "bots" },
  "show-apps": { kind: "sidebar-mode", mode: "apps" },
  "open-workspace-tasks": { kind: "workspace-tool", tool: "tasks" },
  "open-workspace-workflows": { kind: "workspace-tool", tool: "workflows" },
  "open-workspace-worktrees": { kind: "workspace-tool", tool: "worktrees" },
  "open-workspace-merge-requests": { kind: "workspace-tool", tool: "merge-requests" },
  "open-workspace-issues": { kind: "workspace-tool", tool: "issues" },
  "open-workspace-documents": { kind: "workspace-tool", tool: "documents" },
  "open-workspace-library": { kind: "workspace-tool", tool: "library" }
};

/** Whether a shortcut can act now: rail views always can; a tool needs an active workspace that offers it (git tools need Git). */
export function canRunNavigationShortcut(target: NavigationShortcutTarget, workspace: { git: boolean } | null): boolean {
  if (target.kind === "sidebar-mode") return true;
  return workspace !== null && availableWorkspaceTools(workspace.git).includes(target.tool);
}
