import { noraWorkspaceManagementClient } from "@/components/app/clients/noraWorkspaceManagementClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
import type { UiState } from "@/components/app/types";
import type { AppState } from "@shared/appTypes";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback } from "react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";

export function useWorkspaceLifecycleActions({
  setUiState,
  setIsAddingWorkspace,
  setRemovingWorkspaceRoots,
  statusBar,
  safely,
  focusWorkspaceWithRecovery,
  finishAddingWorkspace,
  addWorkspaceBaselineSignatureRef,
  addWorkspaceStatusIdRef,
  getWorkspacePresenceSignature
}: {
  setUiState: Dispatch<SetStateAction<UiState>>;
  setIsAddingWorkspace: Dispatch<SetStateAction<boolean>>;
  setRemovingWorkspaceRoots: Dispatch<SetStateAction<string[]>>;
  statusBar: StatusBarContextValue;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  finishAddingWorkspace: () => void;
  addWorkspaceBaselineSignatureRef: MutableRefObject<string>;
  addWorkspaceStatusIdRef: MutableRefObject<number | null>;
  getWorkspacePresenceSignature: (snapshot: AppState | null) => string;
}): {
  handleChooseWorkspaceAtPath: (defaultPath: string, title?: string) => Promise<void>;
  handleOpenRecentWorkspace: (projectRoot: string, projectName: string) => Promise<void>;
  openAddWorkspaceModal: () => Promise<AppState | null>;
  handleChooseLocalWorkspace: () => Promise<void>;
  handleRemoveWorkspace: (projectRoot: string) => Promise<void>;
} {
  const snapshot = useCanonicalAppSnapshot();

  const handleChooseWorkspaceAtPath = useCallback(async (defaultPath: string, title?: string): Promise<void> => {
    addWorkspaceBaselineSignatureRef.current = getWorkspacePresenceSignature(snapshot);
    setIsAddingWorkspace(true);
    addWorkspaceStatusIdRef.current = statusBar.beginStatus("Adding workspace", true);

    try {
      await safely(() => noraWorkspaceClient.chooseProjectAtPath(defaultPath, title));
    } finally {
      finishAddingWorkspace();
    }
  }, [
    addWorkspaceBaselineSignatureRef,
    addWorkspaceStatusIdRef,
    finishAddingWorkspace,
    getWorkspacePresenceSignature,
    safely,
    setIsAddingWorkspace,
    snapshot,
    statusBar
  ]);

  const handleOpenRecentWorkspace = useCallback(async (projectRoot: string, projectName: string): Promise<void> => {
    const matchingWorkspace = snapshot?.workspaces.find((workspace) => workspace.project.rootPath === projectRoot) || null;
    if (matchingWorkspace) {
      await focusWorkspaceWithRecovery(matchingWorkspace.project.id);
      return;
    }

    await handleChooseWorkspaceAtPath(projectRoot, `Add ${projectName}`);
  }, [focusWorkspaceWithRecovery, handleChooseWorkspaceAtPath, snapshot?.workspaces]);

  const openAddWorkspaceModal = useCallback(async (): Promise<AppState | null> => {
    setUiState((current) => ({ ...current, showAddWorkspaceModal: true }));
    return null;
  }, [setUiState]);

  const handleChooseLocalWorkspace = useCallback(async (): Promise<void> => {
    setUiState((current) => ({ ...current, showAddWorkspaceModal: false }));
    addWorkspaceBaselineSignatureRef.current = getWorkspacePresenceSignature(snapshot);
    setIsAddingWorkspace(true);
    addWorkspaceStatusIdRef.current = statusBar.beginStatus("Adding workspace", true);

    try {
      await safely(() => noraWorkspaceClient.chooseProject());
    } finally {
      finishAddingWorkspace();
    }
  }, [
    addWorkspaceBaselineSignatureRef,
    addWorkspaceStatusIdRef,
    finishAddingWorkspace,
    getWorkspacePresenceSignature,
    safely,
    setIsAddingWorkspace,
    setUiState,
    snapshot,
    statusBar
  ]);

  const handleRemoveWorkspace = useCallback(async (projectRoot: string): Promise<void> => {
    setRemovingWorkspaceRoots((current) => (current.includes(projectRoot) ? current : [...current, projectRoot]));
    const statusId = statusBar.beginStatus("Removing workspace", true);

    try {
      await safely(() => noraWorkspaceManagementClient.removeWorkspace(projectRoot));
    } finally {
      setRemovingWorkspaceRoots((current) => current.filter((root) => root !== projectRoot));
      statusBar.endStatus(statusId);
    }
  }, [safely, setRemovingWorkspaceRoots, statusBar]);

  return {
    handleChooseWorkspaceAtPath,
    handleOpenRecentWorkspace,
    openAddWorkspaceModal,
    handleChooseLocalWorkspace,
    handleRemoveWorkspace
  };
}
