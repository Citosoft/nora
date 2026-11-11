import { SessionTabPane, SessionTabStack } from "@/components/app/panels/SessionTabStack";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { buildWorkspaceGroups } from "@/components/app/logic/workspaceGroups";
import { WorkspaceToolContent } from "@/components/app/panels/workspace-tools/WorkspaceToolContent";
import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { WorkspaceSessionPanelProvider } from "@/components/app/context/workspaceSessionPanelContext";
import { NoteCenter as AppNoteCenter } from "@/components/app/notes/NoteCenter";
import { TaskPanel as AppTaskPanel } from "@/components/app/panels/TaskPanel";
import { WorkspaceSessionPanel as AppWorkspaceSessionPanel } from "@/components/app/panels/WorkspaceSessionPanel";
import { ProjectSelectorScreen as AppProjectSelectorScreen } from "@/components/app/screens/ProjectSelectorScreen";
import { SpecCenter as AppSpecCenter } from "@/components/app/specs/SpecCenter";
import { TaskCenter as AppTaskCenter } from "@/components/app/tasks/TaskCenter";

export function AppMainCenterContent() {
  const snapshot = useCanonicalAppSnapshot();
  const { route } = useWorkspaceNavigation();
  const workspace = buildWorkspaceGroups(snapshot, new Set()).find((entry) => entry.project.id === route?.projectId);
  const {
    taskPanelProps,
    isTaskBoardOpen,
    isSpecBrowserOpen,
    isNoteBrowserOpen,
    shouldShowProjectSelectorScreen,
    workspaceSessionPanelProps
  } = useAppMainCenterContent();

  const overlay = route && workspace ? <WorkspaceToolContent key={`${route.projectId}:${route.tool}`} tool={route.tool} workspace={workspace} />
    : taskPanelProps ? <AppTaskPanel />
    : isTaskBoardOpen ? <AppTaskCenter />
    : isSpecBrowserOpen ? <AppSpecCenter />
    : isNoteBrowserOpen ? <AppNoteCenter />
    : shouldShowProjectSelectorScreen ? <AppProjectSelectorScreen /> : null;
  const obscured = !!overlay;
  return <SessionTabStack className="h-full">
    <SessionTabPane visible={!obscured}>
      <WorkspaceSessionPanelProvider value={workspaceSessionPanelProps}><AppWorkspaceSessionPanel /></WorkspaceSessionPanelProvider>
    </SessionTabPane>
    {overlay && <SessionTabPane visible className="bg-background">{overlay}</SessionTabPane>}
  </SessionTabStack>;
}
