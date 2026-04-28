import { noraSessionClient } from "@/components/app/clients/noraSessionClient";
import type { WorkspaceQuickSearchPick } from "@/components/app/types/titlebarWorkspaceSearch.types";
import type { AppState } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback } from "react";

export function useWorkspaceQuickSearchActions({
  safely,
  resetWorkspaceMainSurface,
  openTaskEditor,
  focusWorkspaceWithRecovery,
  openWorkspaceSpec,
  openWorkspaceNote,
  openFileEditor,
  workspaceFilesRootPath
}: {
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  resetWorkspaceMainSurface: (options?: {
    setMainView?: boolean;
    clearFocusedAiChatTab?: boolean;
  }) => void;
  openTaskEditor: (projectId: string, path: string) => Promise<void>;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  openWorkspaceSpec: (projectId: string, path: string) => Promise<void>;
  openWorkspaceNote: (projectId: string, path: string) => Promise<void>;
  openFileEditor: (pathName: string, options?: { selectChange?: boolean; rootPath?: string | null }) => Promise<void>;
  workspaceFilesRootPath: string | null;
}): {
  handleWorkspaceQuickSearchPick: (pick: WorkspaceQuickSearchPick) => void;
} {
  const snapshot = useCanonicalAppSnapshot();
  const handleWorkspaceQuickSearchPick = useCallback((pick: WorkspaceQuickSearchPick) => {
    if (!snapshot) {
      return;
    }

    resetWorkspaceMainSurface();

    switch (pick.kind) {
      case "agent": {
        void safely(() => noraSessionClient.focusAgent(pick.agentId));
        return;
      }

      case "terminal": {
        void safely(() => noraSessionClient.focusTerminal(pick.terminalId));
        return;
      }

      case "task": {
        if (snapshot.project?.id === pick.projectId) {
          void openTaskEditor(pick.projectId, pick.path);
          return;
        }

        void focusWorkspaceWithRecovery(pick.projectId).then((next) => {
          if (!next) {
            return;
          }

          void openTaskEditor(pick.projectId, pick.path);
        });
        return;
      }

      case "spec": {
        void openWorkspaceSpec(pick.projectId, pick.path);
        return;
      }

      case "note": {
        void openWorkspaceNote(pick.projectId, pick.path);
        return;
      }

      case "file": {
        void openFileEditor(pick.path, {
          selectChange: false,
          rootPath: workspaceFilesRootPath
        });
        return;
      }

      default: {
        const exhaustive: never = pick;
        return exhaustive;
      }
    }
  }, [
    focusWorkspaceWithRecovery,
    openFileEditor,
    openTaskEditor,
    openWorkspaceNote,
    openWorkspaceSpec,
    resetWorkspaceMainSurface,
    safely,
    snapshot,
    workspaceFilesRootPath
  ]);

  return { handleWorkspaceQuickSearchPick };
}
