import { useCallback, useContext, useMemo } from "react";
import { useWaitingRequests } from "./useWaitingRequests";
import { WorkspaceNavigationContext } from "@/components/app/context/workspaceNavigationContext";
import { useThreadCenterPorts } from "./useThreadCenterPorts";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { buildHomeActivity } from "@/components/app/logic/workspace-home/activity";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { WorkspaceHomeProps } from "@/components/app/types/workspace-home/home.types";

export function useWorkspaceHome(): WorkspaceHomeProps {
  const { state, store } = useThreadCenterPorts();
  const navigation = useContext(WorkspaceNavigationContext);
  const workspaceId = state.layout.focusedWorkspaceId;
  const workspace = state.boot.workspaces.find((entry) => entry.id === workspaceId) ?? null;
  const environmentId = state.boot.environmentId;
  const inWorkspace = useCallback((conversation: Conversation) => conversation.workspace.projectId === workspaceId
    && conversation.workspace.environmentId === environmentId, [workspaceId, environmentId]);
  const requests = useWaitingRequests(inWorkspace);
  const answeredInline = useMemo(() => new Set(requests.toasts.map((toast) => toast.conversation.id)), [requests.toasts]);
  const activity = useMemo(() => buildHomeActivity(workspaceId ? buildThreadNavigation(state, workspaceId, "all") : [], answeredInline), [state, workspaceId, answeredInline]);
  const providerLabels = useMemo(() => new Map(state.boot.providers.map((provider) => [provider.kind, provider.label])), [state.boot.providers]);
  const projectId = workspace?.shellProjectId;
  return {
    workspace, activity, requests, providerLabels, loading: state.loading, error: state.error,
    onNewThread: (text) => { if (workspace) store.openDraft({ workspaceId: workspace.id, text }); },
    onOpenThread: (row) => {
      if (row.target.kind === "draft") store.focusDocument(row.target.documentId);
      else store.openThread(row.target.conversationId);
    },
    onRetry: () => { void store.refresh(); },
    onOpenTool: projectId && navigation ? (tool) => navigation.openTool(projectId, tool) : null
  };
}
