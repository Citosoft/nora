import type { ChangesPanelTab } from "@/components/app/types/changesPanelTab.types";
import type { ProjectSummary } from "@shared/appTypes";
import { isGitProject } from "@shared/projectVersionControl";

const CHANGES_PANEL_TABS: readonly ChangesPanelTab[] = ["git", "files", "context", "vercel", "forge"];
// Vercel matches deployments to the project through its git remote, so it is git-only too.
const GIT_ONLY_CHANGES_PANEL_TABS: ReadonlySet<ChangesPanelTab> = new Set(["git", "forge", "vercel"]);

/** With no project open every tab stays listed so the panel layout does not jump while a project loads. */
export function listAvailableChangesPanelTabs(project: ProjectSummary | null): ChangesPanelTab[] {
  if (!project || isGitProject(project)) {
    return [...CHANGES_PANEL_TABS];
  }
  return CHANGES_PANEL_TABS.filter((tab) => !GIT_ONLY_CHANGES_PANEL_TABS.has(tab));
}

/** Falls back to Files when the remembered tab is unavailable, without overwriting the stored preference. */
export function resolveAvailableChangesPanelTab(tab: ChangesPanelTab, availableTabs: ChangesPanelTab[]): ChangesPanelTab {
  return availableTabs.includes(tab) ? tab : "files";
}
