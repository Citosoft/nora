import { useMemo } from "react";
import { isGitProject } from "@shared/projectVersionControl";
import { NAVIGATION_KEYBINDING_COMMAND_IDS } from "@shared/keybindings/commandIds";
import type { NavigationKeybindingCommandId } from "@shared/types/keybindings/keybindings.types";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useKeyboardShortcuts } from "@/components/app/hooks/useKeyboardShortcuts";
import { canRunNavigationShortcut, NAVIGATION_SHORTCUT_TARGETS } from "@/components/app/logic/workspace-navigation/shortcuts";
import type { NavigationShortcutTarget, WorkspaceNavigationValue } from "@/components/app/types/workspaceNavigation.types";

/** Binds the rail-view and workspace-tool shortcuts to the navigation the provider owns. */
export function useNavigationShortcuts({ openTool, selectSidebarMode }: Pick<WorkspaceNavigationValue, "openTool" | "selectSidebarMode">): void {
  const project = useCanonicalAppSnapshot()?.project ?? null;
  const projectId = project?.id ?? null;
  const git = isGitProject(project);
  const actions = useMemo(() => {
    const run = (target: NavigationShortcutTarget): void => {
      if (!canRunNavigationShortcut(target, projectId === null ? null : { git })) return;
      if (target.kind === "sidebar-mode") selectSidebarMode(target.mode);
      else if (projectId !== null) openTool(projectId, target.tool);
    };
    const map: Partial<Record<NavigationKeybindingCommandId, () => void>> = {};
    for (const id of NAVIGATION_KEYBINDING_COMMAND_IDS) map[id] = () => run(NAVIGATION_SHORTCUT_TARGETS[id]);
    return map;
  }, [git, openTool, projectId, selectSidebarMode]);
  useKeyboardShortcuts(actions);
}
