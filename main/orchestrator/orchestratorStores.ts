import { getProjectFile, getSessionFile } from "../noraPaths";
import { ProjectIndexStore } from "../projectIndexStore";
import { RecentProjectsStore } from "../recentProjectsStore";
import { SessionIndexStore } from "../sessionIndexStore";
import { ToolConfigStore } from "../toolConfigStore";
import type { OrchestratorOptions } from "../types/internal.types";

export function createOrchestratorStores(options: OrchestratorOptions): {
  recentProjectsStore: RecentProjectsStore;
  toolConfigStore: ToolConfigStore;
  projectIndexStore: ProjectIndexStore;
  sessionIndexStore: SessionIndexStore;
} {
  return {
    recentProjectsStore: new RecentProjectsStore(options.recentProjectsPath),
    toolConfigStore: new ToolConfigStore(options.toolConfigPath),
    projectIndexStore: new ProjectIndexStore(options.projectsIndexPath, getProjectFile),
    sessionIndexStore: new SessionIndexStore(options.sessionsIndexPath, getSessionFile)
  };
}
