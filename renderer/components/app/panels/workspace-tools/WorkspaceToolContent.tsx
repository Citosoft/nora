import type { ReactNode } from "react";
import type { AppMainCenterContentValue } from "@/components/app/types/appMainCenterContent.types";
import { AppMainCenterContentProvider, useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { TaskCenter } from "@/components/app/tasks/TaskCenter";
import { LoopWorkspaceSection } from "@/components/app/sidebar/workspace-sidebar/LoopWorkspaceSection";
import { WorkspaceDocumentsTool } from "@/components/app/panels/workspace-tools/WorkspaceDocumentsTool";
import { WorkspaceDevelopmentTool } from "@/components/app/panels/workspace-tools/WorkspaceDevelopmentTool";
import { WorkspaceTerminalsTool } from "@/components/app/panels/workspace-tools/WorkspaceTerminalsTool";
import { WorkspaceToolHeader } from "@/components/app/panels/workspace-tools/WorkspaceToolHeader";
import type { WorkspaceToolContentProps } from "@/components/app/types/workspaceNavigation.types";
import { WORKSPACE_TOOLS } from "@/components/app/constants/workspaceTools";

export function WorkspaceToolContent({ tool, workspace }: WorkspaceToolContentProps) {
  const value = useAppMainCenterContent();
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const { closeTool, returnToThread } = useWorkspaceNavigation();
  const projectId = workspace.project.id;
  const scoped: AppMainCenterContentValue = { ...value,
    taskCenterProps: { ...value.taskCenterProps, projectId, onClose: returnToThread,
      onCreateTask: (id: string) => { closeTool(); value.taskCenterProps.onCreateTask(id); },
      onOpenTask: (id: string, path: string) => { closeTool(); value.taskCenterProps.onOpenTask(id, path); } },
    noteCenterProps: { ...value.noteCenterProps, projectId, onClose: returnToThread,
      onCreateNote: (id: string) => { closeTool(); value.noteCenterProps.onCreateNote(id); },
      onOpenNote: (id: string, path: string) => { closeTool(); value.noteCenterProps.onOpenNote(id, path); } },
    specCenterProps: { ...value.specCenterProps, projectId, onClose: returnToThread,
      onCreateSpec: (id: string) => { closeTool(); value.specCenterProps.onCreateSpec(id); },
      onOpenSpec: (id: string, path: string) => { closeTool(); value.specCenterProps.onOpenSpec(id, path); },
      onGenerateTasksFromSpec: (id: string, path: string) => { closeTool(); value.specCenterProps.onGenerateTasksFromSpec(id, path); } }
  };
  let content: ReactNode;
  switch (tool) {
    case "tasks": content = <TaskCenter />; break;
    case "documents": content = <WorkspaceDocumentsTool />; break;
    case "development": content = <WorkspaceDevelopmentTool workspace={workspace} />; break;
    case "terminals": content = <WorkspaceTerminalsTool workspace={workspace} />; break;
    case "workflows": content = <div className="h-full overflow-y-auto py-4"><LoopWorkspaceSection workspace={workspace} agentCatalog={snapshot?.agentCatalog ?? []} onCreateChangeRequest={(run) => {
      if (!run.worktreeId) return Promise.reject(new Error("This workflow run does not have a managed worktree."));
      return actions.onOpenWorkflowRunChangeRequest(run.projectId, run.worktreeId);
    }} /></div>; break;
    // Files and Changes share the existing mounted panel in the workspace grid.
    case "files": case "changes": case "browser": return null;
  }
  return <AppMainCenterContentProvider value={scoped}>
    <section className="flex h-full min-h-0 flex-col" aria-label={`${tool} for ${workspace.project.name}`}>
      <WorkspaceToolHeader title={WORKSPACE_TOOLS.find((entry) => entry.id === tool)?.label ?? tool} workspaceName={workspace.project.name} />
      <div className="min-h-0 flex-1">{content}</div>
    </section>
  </AppMainCenterContentProvider>;
}
