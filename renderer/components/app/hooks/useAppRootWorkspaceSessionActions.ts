import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { useFileEditorState } from "@/components/app/hooks/useFileEditorState";
import { isWorkspaceNoteMarkdownPath, isWorkspaceSpecMarkdownPath } from "@/components/app/logic/workspaceNoraPaths";
import type {
  UseAppRootWorkspaceSessionActionsArgs,
  UseAppRootWorkspaceSessionActionsResult
} from "@/components/app/types/useAppRootWorkspaceSessionActions.types";
import type { CreateTerminalPayload, ProjectSummary } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback } from "react";

export function useAppRootWorkspaceSessionActions({
  safely,
  runWithStatus,
  focusWorkspaceWithRecovery,
  setUiState,
  onOpenEditor,
  reloadWorkspaceNotesForProject,
  reloadWorkspaceSpecsForProject
}: UseAppRootWorkspaceSessionActionsArgs): UseAppRootWorkspaceSessionActionsResult {
  const snapshot = useCanonicalAppSnapshot();
  const createTerminalWithStatus = useCallback(
    async (payload: CreateTerminalPayload) => runWithStatus("Creating terminal", () => noraTerminalClient.createTerminal(payload)),
    [runWithStatus]
  );

  const launchTerminalInWorkspace = useCallback(
    async (projectId: string, payload: CreateTerminalPayload): Promise<void> => {
      if (snapshot?.project?.id !== projectId) {
        const next = await focusWorkspaceWithRecovery(projectId);
        if (!next) {
          return;
        }
      }

      await createTerminalWithStatus(payload);
    },
    [createTerminalWithStatus, focusWorkspaceWithRecovery, snapshot?.project?.id]
  );

  const saveWorkspaceTerminalPresets = useCallback(
    async (
      projectId: string,
      presets: NonNullable<ProjectSummary["workspaceTerminalPresets"]>
    ): Promise<void> => {
      const next = await safely(() => noraWorkspaceClient.saveWorkspaceTerminalPresets(projectId, presets));
      if (!next) {
        return;
      }

      setUiState((current) => ({
        ...current,
        workspaceTerminalPresetsProjectId: null
      }));
    },
    [safely, setUiState]
  );

  const handleAfterWorkspaceFileSaved = useCallback(
    ({ projectId, path }: { projectId: string; path: string }) => {
      if (isWorkspaceNoteMarkdownPath(path)) {
        void reloadWorkspaceNotesForProject(projectId);
      }
      if (isWorkspaceSpecMarkdownPath(path)) {
        void reloadWorkspaceSpecsForProject(projectId);
      }
    },
    [reloadWorkspaceNotesForProject, reloadWorkspaceSpecsForProject]
  );

  const fileEditorState = useFileEditorState({
    safely,
    setUiState,
    onOpenEditor,
    onAfterWorkspaceFileSaved: handleAfterWorkspaceFileSaved
  });

  return {
    ...fileEditorState,
    createTerminalWithStatus,
    launchTerminalInWorkspace,
    saveWorkspaceTerminalPresets
  };
}
