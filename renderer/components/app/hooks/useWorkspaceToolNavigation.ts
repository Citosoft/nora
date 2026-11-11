import { useCallback, useEffect, useRef, useState } from "react";
import { useAppRootState } from "@/components/app/context/appRootStateContext";
import { useCanonicalAppSnapshot } from "./useAppDomainState";
import { useThreadNavigationPorts } from "./useThreadNavigationPorts";
import { useThreadTabsPorts } from "./useThreadTabsPorts";
import { resolveWorkspaceToolRoute } from "@/components/app/logic/workspace-navigation/routes";
import { updateWorkspaceView } from "@/components/app/logic/workspace-navigation/viewState";
import type { WorkspaceNavigationValue, WorkspaceToolRoute } from "@/components/app/types/workspaceNavigation.types";
import type { WorkspaceToolNavigation, WorkspaceViewStoreInput } from "@/components/app/types/workspaceView.types";

export function useWorkspaceToolNavigation({ preferences, setPreferences }: WorkspaceViewStoreInput): WorkspaceToolNavigation {
  const snapshot = useCanonicalAppSnapshot();
  const project = snapshot?.project ?? null;
  const request = useAppRootState().uiState.workspaceToolRequest;
  const projectId = project?.id ?? null;
  const { state } = useThreadNavigationPorts();
  const tabs = useThreadTabsPorts();
  const focusRevision = useRef(state.focusRevision);
  const handledRequest = useRef(0);
  const previousTerminal = useRef({ projectId, id: snapshot?.focusedTerminalId });
  const threadSelected = focusRevision.current !== state.focusRevision;
  const [openedTools, setOpenedTools] = useState<WorkspaceToolRoute[]>(() => Object.entries(preferences.workspaceViews)
    .flatMap(([id, view]) => view.activeTool ? [{ projectId: id, tool: view.activeTool }] : []));

  const openTool = useCallback<WorkspaceNavigationValue["openTool"]>((id, tool) => {
    if (id !== projectId) return;
    setPreferences((current) => updateWorkspaceView(current, id, { activeTool: tool }));
    setOpenedTools((current) => current.some((entry) => entry.projectId === id && entry.tool === tool)
      ? current : [...current, { projectId: id, tool }]);
  }, [projectId, setPreferences]);
  useEffect(() => {
    if (!request || request.revision === handledRequest.current || request.projectId !== projectId) return;
    handledRequest.current = request.revision;
    openTool(request.projectId, request.tool);
  }, [request, projectId, openTool]);
  useEffect(() => {
    const id = snapshot?.focusedTerminalId;
    const changed = previousTerminal.current.projectId === projectId && previousTerminal.current.id !== id;
    const previousStillExists = !previousTerminal.current.id || !!snapshot?.terminals.some((terminal) => terminal.id === previousTerminal.current.id);
    previousTerminal.current = { projectId, id };
    if (changed && id && projectId && previousStillExists) {
      setPreferences((current) => updateWorkspaceView(current, projectId, { terminalId: id }));
      openTool(projectId, "terminals");
    }
  }, [snapshot?.focusedTerminalId, snapshot?.terminals, projectId, openTool, setPreferences]);
  const closeTool = useCallback(() => {
    if (projectId) setPreferences((current) => updateWorkspaceView(current, projectId, { activeTool: null }));
  }, [projectId, setPreferences]);
  const returnToThread = useCallback(() => {
    closeTool();
    if (tabs.activeId) tabs.focus(tabs.activeId);
  }, [closeTool, tabs.activeId, tabs.focus]);

  // Thread selection clears only its workspace's tool; other workspaces retain their last view.
  useEffect(() => {
    if (focusRevision.current === state.focusRevision) return;
    focusRevision.current = state.focusRevision;
    const ownerId = state.boot.workspaces.find((entry) => entry.id === state.layout.focusedWorkspaceId)?.shellProjectId ?? projectId;
    if (ownerId) setPreferences((current) => current.workspaceViews[ownerId]?.activeTool
      ? updateWorkspaceView(current, ownerId, { activeTool: null }) : current);
  }, [state.focusRevision, state.layout.focusedWorkspaceId, state.boot.workspaces, projectId, setPreferences]);

  const tool = projectId ? preferences.workspaceViews[projectId]?.activeTool : null;
  const route = !threadSelected && tool && projectId
    ? resolveWorkspaceToolRoute({ projectId, tool }, projectId, project) : null;
  return { route, openedTools, openTool, closeTool, returnToThread };
}
