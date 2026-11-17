import { useContext, useMemo } from "react";
import { WorkspaceNavigationContext } from "@/components/app/context/workspaceNavigationContext";
import { useThreadCenterPorts } from "./useThreadCenterPorts";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { buildHomeActivity } from "@/components/app/logic/workspace-home/activity";
import type { WorkspaceHomeProps } from "@/components/app/types/workspace-home/home.types";

export function useWorkspaceHome(): WorkspaceHomeProps {
  const { state, store } = useThreadCenterPorts();
  const navigation = useContext(WorkspaceNavigationContext);
  const workspaceId = state.layout.focusedWorkspaceId;
  const workspace = state.boot.workspaces.find((entry) => entry.id === workspaceId) ?? null;
  const activity = useMemo(() => buildHomeActivity(workspaceId ? buildThreadNavigation(state, workspaceId, "all") : []), [state, workspaceId]);
  const projectId = workspace?.shellProjectId;
  return {
    workspace, activity, loading: state.loading, error: state.error,
    onNewThread: () => { if (workspace) store.openDraft({ workspaceId: workspace.id }); },
    onOpenThread: (row) => {
      if (row.target.kind === "draft") store.focusDocument(row.target.documentId);
      else store.openThread(row.target.conversationId);
    },
    onRetry: () => { void store.refresh(); },
    onOpenTool: projectId && navigation ? (tool) => navigation.openTool(projectId, tool) : null
  };
}
