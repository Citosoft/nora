import type { ReactNode } from "react";
import type { AppMainCenterContentValue } from "@/components/app/types/appMainCenterContent.types";
import { AppMainCenterContentProvider, useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { TaskCenter } from "@/components/app/tasks/TaskCenter";
import { WorkspaceWorkflowsTool } from "./WorkspaceWorkflowsTool";
import { WorkspaceBrowserTool } from "./WorkspaceBrowserTool";
import { WorkspaceSessionPanelProvider } from "@/components/app/context/workspaceSessionPanelContext";
import { WorkspaceDocumentsTool } from "@/components/app/panels/workspace-tools/WorkspaceDocumentsTool";
import { WorkspaceTerminalsTool } from "@/components/app/panels/workspace-tools/WorkspaceTerminalsTool";
import { WorkspaceWorktreesTool } from "./WorkspaceWorktreesTool";
import { WorkspaceToolHeader } from "@/components/app/panels/workspace-tools/WorkspaceToolHeader";
import type { WorkspaceToolContentProps } from "@/components/app/types/workspaceNavigation.types";
import { WORKSPACE_TOOLS } from "@/components/app/constants/workspaceTools";

export function WorkspaceToolContent({ tool, workspace, active }: WorkspaceToolContentProps) {
  const value = useAppMainCenterContent();
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const { closeTool, returnToThread } = useWorkspaceNavigation();
  const projectId = workspace.project.id;
  const scoped: AppMainCenterContentValue = { ...value,
    workspaceSessionPanelProps: { ...value.workspaceSessionPanelProps, project: workspace.project, workspace },
    taskCenterProps: { ...value.taskCenterProps, projectId, onClose: returnToThread,
      onCreateTask: (id: string) => { closeTool(); value.taskCenterProps.onCreateTask(id); },
      onOpenTask: (id: string, path: string) => { closeTool(); value.taskCenterProps.onOpenTask(id, path); } },
    noteCenterProps: { ...value.noteCenterProps, projectId, onClose: returnToThread,
      onCreateNote: value.noteCenterProps.onCreateNote,
      onOpenNote: value.noteCenterProps.onOpenNote },
    specCenterProps: { ...value.specCenterProps, projectId, onClose: returnToThread,
      onCreateSpec: value.specCenterProps.onCreateSpec,
      onOpenSpec: value.specCenterProps.onOpenSpec,
      onGenerateTasksFromSpec: (id: string, path: string) => { closeTool(); value.specCenterProps.onGenerateTasksFromSpec(id, path); } }
  };
  let content: ReactNode;
  switch (tool) {
    case "tasks": content = <TaskCenter />; break;
    case "documents": content = <WorkspaceDocumentsTool workspace={workspace} active={active} />; break;
    case "terminals": content = <WorkspaceTerminalsTool workspace={workspace} />; break;
    case "workflows": content = <WorkspaceWorkflowsTool workspace={workspace} agentCatalog={snapshot?.agentCatalog ?? []} onCreateChangeRequest={(run) => {
      if (!run.worktreeId) return Promise.reject(new Error("This workflow run does not have a managed worktree."));
      return actions.onOpenWorkflowRunChangeRequest(run.projectId, run.worktreeId);
    }} />; break;
    case "worktrees": content = <WorkspaceWorktreesTool workspace={workspace} />; break;
    case "browser": content = <WorkspaceBrowserTool workspace={workspace} active={active} />; break;
  }
  return <AppMainCenterContentProvider value={scoped}><WorkspaceSessionPanelProvider value={scoped.workspaceSessionPanelProps}>
    <section className="flex h-full min-h-0 flex-col" aria-label={`${tool} for ${workspace.project.name}`}>
      <WorkspaceToolHeader title={WORKSPACE_TOOLS.find((entry) => entry.id === tool)?.label ?? tool} workspaceName={workspace.project.name} />
      <div className="min-h-0 flex-1">{content}</div>
    </section>
  </WorkspaceSessionPanelProvider></AppMainCenterContentProvider>;
}
