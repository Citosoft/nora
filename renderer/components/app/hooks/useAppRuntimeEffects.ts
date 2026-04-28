import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import { writeStoredWorkspaceContentState } from "@/components/app/logic/appPersistence";
import type { StoredWorkspaceContentState } from "@/components/app/types";
import type { UseAppRuntimeEffectsArgs } from "@/components/app/types/appRuntimeEffects.types";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect } from "react";

export function useAppRuntimeEffects({
  activeWorkspaceContentTab,
  fileEditorState,
  setFileEditorState,
  setUiState,
  setAppClosingState,
  setLocalTerminalState,
  workspaceLoading,
  isAddingWorkspace,
  isRemoteMountedWorkspace,
  refreshSnapshot,
  activityRefreshTimeoutRef,
  taskRefreshTimeoutRef,
  reloadWorkspaceTasksForProject,
  selectedChange,
  setIsCenterDiffExpanded,
  setTaskEditorState,
  addWorkspaceBaselineSignatureRef,
  finishAddingWorkspace,
  getWorkspacePresenceSignature
}: UseAppRuntimeEffectsArgs): void {
  const snapshot = useCanonicalAppSnapshot();
  useEffect(() => {
    const nextStoredContentState: StoredWorkspaceContentState = {
      activeWorkspaceContentTab,
      fileEditor: fileEditorState
        ? {
            tabs: fileEditorState.tabs.map((tab) => ({
              projectId: tab.projectId,
              path: tab.path,
              rootPath: tab.rootPath
            })),
            activePath: fileEditorState.activePath
          }
        : null
    };

    writeStoredWorkspaceContentState(nextStoredContentState);
  }, [activeWorkspaceContentTab, fileEditorState]);

  useEffect(() => {
    if (!snapshot?.errorMessage) {
      return;
    }

    setUiState((current) =>
      current.activeErrorMessage === snapshot.errorMessage
        ? current
        : {
            ...current,
            activeErrorMessage: snapshot.errorMessage
          }
    );
  }, [setUiState, snapshot?.errorMessage]);

  useEffect(() => noraSystemClient.onAppClosingProgress((payload) => {
    setAppClosingState(payload);
  }), [setAppClosingState]);

  useEffect(() => {
    let cancelled = false;

    void noraTerminalClient.getLocalTerminalState().then((next) => {
      if (!cancelled) {
        setLocalTerminalState(next);
      }
    }).catch(() => {
      if (!cancelled) {
        setLocalTerminalState(null);
      }
    });

    const unsubscribe = noraTerminalClient.onLocalTerminalStateChanged((next) => {
      setLocalTerminalState(next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setLocalTerminalState]);

  useEffect(() => {
    if (!snapshot?.project || workspaceLoading || isAddingWorkspace) {
      return;
    }

    const activeSessionIds = new Set(snapshot.sessions.map((session) => session.id));
    const debounceMs = isRemoteMountedWorkspace ? 6000 : 2500;

    const unsubscribe = noraTerminalClient.onTerminalData(({ sessionId }) => {
      if (document.hidden || !activeSessionIds.has(sessionId)) {
        return;
      }

      if (activityRefreshTimeoutRef.current !== null) {
        window.clearTimeout(activityRefreshTimeoutRef.current);
      }

      activityRefreshTimeoutRef.current = window.setTimeout(() => {
        activityRefreshTimeoutRef.current = null;
        void refreshSnapshot("Refreshing git changes");
      }, debounceMs);
    });

    return () => {
      unsubscribe();
      if (activityRefreshTimeoutRef.current !== null) {
        window.clearTimeout(activityRefreshTimeoutRef.current);
        activityRefreshTimeoutRef.current = null;
      }
    };
  }, [snapshot?.project?.id, snapshot?.sessions, isRemoteMountedWorkspace, workspaceLoading, isAddingWorkspace, refreshSnapshot, activityRefreshTimeoutRef]);

  useEffect(() => () => {
    if (taskRefreshTimeoutRef.current !== null) {
      window.clearTimeout(taskRefreshTimeoutRef.current);
      taskRefreshTimeoutRef.current = null;
    }
  }, [taskRefreshTimeoutRef]);

  useEffect(() => {
    if (!snapshot || workspaceLoading || isAddingWorkspace) {
      return;
    }

    const projectIds = Array.from(
      new Set([
        ...(snapshot.project ? [snapshot.project.id] : []),
        ...snapshot.workspaces.map((workspace) => workspace.project.id)
      ])
    );

    if (!projectIds.length) {
      return;
    }

    if (taskRefreshTimeoutRef.current !== null) {
      window.clearTimeout(taskRefreshTimeoutRef.current);
    }

    taskRefreshTimeoutRef.current = window.setTimeout(() => {
      taskRefreshTimeoutRef.current = null;
      projectIds.forEach((projectId) => {
        void reloadWorkspaceTasksForProject(projectId);
      });
    }, 1500);

    return () => {
      if (taskRefreshTimeoutRef.current !== null) {
        window.clearTimeout(taskRefreshTimeoutRef.current);
        taskRefreshTimeoutRef.current = null;
      }
    };
  }, [
    snapshot?.project?.id,
    snapshot?.workspaces.map((workspace) => workspace.project.id).join("\n"),
    snapshot?.agents.map((agent) => `${agent.id}:${agent.status}:${agent.lastEventAt}`).join("\n"),
    snapshot?.terminals.map((terminal) => `${terminal.id}:${terminal.status}:${terminal.lastEventAt}`).join("\n"),
    workspaceLoading,
    isAddingWorkspace,
    taskRefreshTimeoutRef,
    reloadWorkspaceTasksForProject,
    snapshot
  ]);

  useEffect(() => {
    if (!selectedChange) {
      setIsCenterDiffExpanded(false);
    }
  }, [selectedChange, setIsCenterDiffExpanded]);

  useEffect(() => {
    const currentProjectId = snapshot?.project?.id || null;
    setFileEditorState((current) => {
      if (!current) {
        return current;
      }
      if (!currentProjectId || current.tabs.some((tab) => tab.projectId !== currentProjectId)) {
        return null;
      }
      return current;
    });
  }, [setFileEditorState, snapshot?.project?.id]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const validProjectIds = new Set([
      ...(snapshot?.project ? [snapshot.project.id] : []),
      ...(snapshot?.workspaces.map((workspace) => workspace.project.id) ?? [])
    ]);

    setTaskEditorState((current) => {
      if (!current) {
        return current;
      }

      return validProjectIds.has(current.projectId) ? current : null;
    });
  }, [setTaskEditorState, snapshot?.project?.id, snapshot?.workspaces.map((workspace) => workspace.project.id).join("\n")]);

  useEffect(() => {
    if (!isAddingWorkspace) {
      return;
    }

    const nextSignature = getWorkspacePresenceSignature(snapshot);
    if (!nextSignature || nextSignature === addWorkspaceBaselineSignatureRef.current) {
      return;
    }

    finishAddingWorkspace();
  }, [isAddingWorkspace, snapshot?.project?.id, snapshot?.workspaces.map((workspace) => workspace.project.id).join("\n"), getWorkspacePresenceSignature, snapshot, addWorkspaceBaselineSignatureRef, finishAddingWorkspace]);

  useEffect(() => {
    if (!isAddingWorkspace || !workspaceLoading) {
      return;
    }

    finishAddingWorkspace();
  }, [isAddingWorkspace, workspaceLoading, finishAddingWorkspace]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const validProjectIds = new Set([
      ...(snapshot.project ? [snapshot.project.id] : []),
      ...snapshot.workspaces.map((workspace) => workspace.project.id)
    ]);

    if (validProjectIds.size === 0) {
      return;
    }

    setUiState((current) => {
      const nextForgeViewerTabs = current.forgeViewerTabs.filter((tab) => validProjectIds.has(tab.projectId));
      const nextAiChatTabs = current.aiChatTabs.filter((tab) => validProjectIds.has(tab.projectId));
      const nextFocusedForgeViewerTabId =
        current.focusedForgeViewerTabId && nextForgeViewerTabs.some((tab) => tab.id === current.focusedForgeViewerTabId)
          ? current.focusedForgeViewerTabId
          : null;
      const nextFocusedAiChatTabId =
        current.focusedAiChatTabId && nextAiChatTabs.some((tab) => tab.id === current.focusedAiChatTabId)
          ? current.focusedAiChatTabId
          : null;

      if (
        nextForgeViewerTabs.length === current.forgeViewerTabs.length &&
        nextFocusedForgeViewerTabId === current.focusedForgeViewerTabId &&
        nextAiChatTabs.length === current.aiChatTabs.length &&
        nextFocusedAiChatTabId === current.focusedAiChatTabId
      ) {
        return current;
      }

      return {
        ...current,
        forgeViewerTabs: nextForgeViewerTabs,
        focusedForgeViewerTabId: nextFocusedForgeViewerTabId,
        aiChatTabs: nextAiChatTabs,
        focusedAiChatTabId: nextFocusedAiChatTabId
      };
    });
  }, [snapshot, setUiState]);
}
