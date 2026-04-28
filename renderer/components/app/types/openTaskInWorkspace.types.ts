import type { AppState } from "@shared/appTypes";

export type OpenTaskInWorkspaceHandlerDeps = {
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  openTaskEditor: (projectId: string, pathName: string) => Promise<void>;
  activeProjectId: string | null;
};
