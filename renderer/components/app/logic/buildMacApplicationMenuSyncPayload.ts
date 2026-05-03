import type { MacApplicationMenuSyncPayload } from "@shared/types/macApplicationMenu.types";
import type { InstalledIde } from "@shared/appTypes";
import type { RecentProject } from "@shared/types/session.types";

export function sortIdesWithPreferredFirst(
  preferredIde: InstalledIde | null,
  installedIdes: InstalledIde[]
): Array<{ id: string; name: string }> {
  const ordered = preferredIde
    ? [preferredIde, ...installedIdes.filter((ide) => ide.id !== preferredIde.id)]
    : [...installedIdes];
  return ordered.map((ide) => ({ id: ide.id, name: ide.name }));
}

export function dedupeRecentWorkspacesForMenu(recentWorkspaces: RecentProject[]): Array<{ rootPath: string; name: string }> {
  const seenRootPaths = new Set<string>();
  return recentWorkspaces
    .filter((project) => {
      if (seenRootPaths.has(project.rootPath)) {
        return false;
      }
      seenRootPaths.add(project.rootPath);
      return true;
    })
    .map((project) => ({ rootPath: project.rootPath, name: project.name }));
}

export function buildMacApplicationMenuSyncPayload(args: {
  phase: MacApplicationMenuSyncPayload["phase"];
  hasActiveWorkspace: boolean;
  canOpenProjectInIde: boolean;
  activeProjectRoot: string | null;
  preferredIde: InstalledIde | null;
  installedIdes: InstalledIde[];
  defaultIdeId: string | null;
  recentWorkspaces: RecentProject[];
}): MacApplicationMenuSyncPayload {
  return {
    phase: args.phase,
    hasActiveWorkspace: args.hasActiveWorkspace,
    canOpenProjectInIde: args.canOpenProjectInIde,
    activeProjectRoot: args.activeProjectRoot,
    preferredIde: args.preferredIde ? { id: args.preferredIde.id, name: args.preferredIde.name } : null,
    idesOrderedForMenu: sortIdesWithPreferredFirst(args.preferredIde, args.installedIdes),
    defaultIdeId: args.defaultIdeId,
    recentWorkspaces: dedupeRecentWorkspacesForMenu(args.recentWorkspaces)
  };
}
