import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { WorkspaceSessionPanelProvider } from "@/components/app/context/workspaceSessionPanelContext";
import { NoteCenter as AppNoteCenter } from "@/components/app/notes/NoteCenter";
import { TaskPanel as AppTaskPanel } from "@/components/app/panels/TaskPanel";
import { WorkspaceSessionPanel as AppWorkspaceSessionPanel } from "@/components/app/panels/WorkspaceSessionPanel";
import { ProjectSelectorScreen as AppProjectSelectorScreen } from "@/components/app/screens/ProjectSelectorScreen";
import { SpecCenter as AppSpecCenter } from "@/components/app/specs/SpecCenter";
import { TaskCenter as AppTaskCenter } from "@/components/app/tasks/TaskCenter";

export function AppMainCenterContent() {
  const {
    taskPanelProps,
    isTaskBoardOpen,
    isSpecBrowserOpen,
    isNoteBrowserOpen,
    shouldShowProjectSelectorScreen,
    workspaceSessionPanelProps
  } = useAppMainCenterContent();

  if (taskPanelProps) {
    return <AppTaskPanel />;
  }

  if (isTaskBoardOpen) {
    return <AppTaskCenter />;
  }

  if (isSpecBrowserOpen) {
    return <AppSpecCenter />;
  }

  if (isNoteBrowserOpen) {
    return <AppNoteCenter />;
  }

  if (shouldShowProjectSelectorScreen) {
    return <AppProjectSelectorScreen />;
  }

  return (
    <WorkspaceSessionPanelProvider value={workspaceSessionPanelProps}>
      <AppWorkspaceSessionPanel />
    </WorkspaceSessionPanelProvider>
  );
}
