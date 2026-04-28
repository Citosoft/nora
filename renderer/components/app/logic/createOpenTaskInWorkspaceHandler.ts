import type { OpenTaskInWorkspaceHandlerDeps } from "@/components/app/types/openTaskInWorkspace.types";

export const createOpenTaskInWorkspaceHandler = (
  d: OpenTaskInWorkspaceHandlerDeps
): ((projectId: string, pathName: string) => void) => {
  const handleOpenTask = (projectId: string, pathName: string): void => {
    if (d.activeProjectId === projectId) {
      void d.openTaskEditor(projectId, pathName);
      return;
    }

    void d.focusWorkspaceWithRecovery(projectId).then((next) => {
      if (!next) {
        return;
      }
      void d.openTaskEditor(projectId, pathName);
    });
  };

  return handleOpenTask;
};
