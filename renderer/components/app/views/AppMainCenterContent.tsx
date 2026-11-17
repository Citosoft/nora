import { SessionTabPane, SessionTabStack } from "@/components/app/panels/SessionTabStack";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { WorkspaceToolPanes } from "@/components/app/panels/workspace-tools/WorkspaceToolPanes";
import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { WorkspaceSessionPanelProvider } from "@/components/app/context/workspaceSessionPanelContext";
import { NoteCenter as AppNoteCenter } from "@/components/app/notes/NoteCenter";
import { TaskPanel as AppTaskPanel } from "@/components/app/panels/TaskPanel";
import { WorkspaceSessionPanel as AppWorkspaceSessionPanel } from "@/components/app/panels/WorkspaceSessionPanel";
import { ProjectSelectorScreen as AppProjectSelectorScreen } from "@/components/app/screens/ProjectSelectorScreen";
import { SpecCenter as AppSpecCenter } from "@/components/app/specs/SpecCenter";
import { TaskCenter as AppTaskCenter } from "@/components/app/tasks/TaskCenter";

export function AppMainCenterContent() {
  const { route } = useWorkspaceNavigation();
  const {
    taskPanelProps,
    isTaskBoardOpen,
    isSpecBrowserOpen,
    isNoteBrowserOpen,
    shouldShowProjectSelectorScreen,
    workspaceSessionPanelProps
  } = useAppMainCenterContent();

  const overlay = taskPanelProps ? <AppTaskPanel />
    : isTaskBoardOpen ? <AppTaskCenter />
    : isSpecBrowserOpen ? <AppSpecCenter />
    : isNoteBrowserOpen ? <AppNoteCenter />
    : shouldShowProjectSelectorScreen ? <AppProjectSelectorScreen /> : null;
  const obscured = !!overlay;
  return <SessionTabStack className="h-full">
    <SessionTabPane visible={!obscured && !route}>
      <WorkspaceSessionPanelProvider value={workspaceSessionPanelProps}><AppWorkspaceSessionPanel /></WorkspaceSessionPanelProvider>
    </SessionTabPane>
    {overlay && <SessionTabPane visible={!route} className="bg-background">{overlay}</SessionTabPane>}
    <WorkspaceToolPanes />
  </SessionTabStack>;
}
