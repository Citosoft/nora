import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { useWorkspaceHome } from "@/components/app/hooks/useWorkspaceHome";
import { WorkspaceHome } from "../workspace-home/WorkspaceHome";
import { WorkspaceHomeBranchStatus } from "../workspace-home/WorkspaceHomeBranchStatus";
import { WorkspaceHomeCommands } from "../workspace-home/WorkspaceHomeCommands";
import { WorkspaceHomeTasks } from "../workspace-home/WorkspaceHomeTasks";
import { SessionTabPane, SessionTabStack } from "../SessionTabStack";
import { ThreadViewContent } from "./ThreadViewContent";
import { useContext } from "react";
import { WorkspaceNavigationContext } from "@/components/app/context/workspaceNavigationContext";
import { BotsHome } from "../bots/BotsHome";
import { RoutineCalendarPage } from "../bots/routine-calendar/RoutineCalendarPage";
import { AttentionTray } from "./AttentionTray";
import { InboxPage } from "../inbox/InboxPage";
import { AppsCenter } from "../apps/AppsCenter";
import { AppBuilderView } from "../apps/AppBuilderView";
import type { SidebarModeHomeProps } from "@/components/app/types/workspaceNavigation.types";

function WorkspaceHomeSurface() {
  const home = useWorkspaceHome();
  const projectId = home.workspace?.shellProjectId ?? null;
  return <WorkspaceHome {...home}
    branchStatus={home.workspace ? <WorkspaceHomeBranchStatus key={home.workspace.id} workspace={home.workspace} /> : null}
    commands={projectId ? <WorkspaceHomeCommands key={projectId} projectId={projectId} /> : null}
    tasks={projectId ? <WorkspaceHomeTasks key={projectId} projectId={projectId} /> : null} />;
}

function SidebarModeHome({ mode, botsHome }: SidebarModeHomeProps) {
  switch (mode) {
    case "inbox": return <InboxPage />;
    case "apps": return <AppsCenter />;
    case "threads": return <WorkspaceHomeSurface />;
    case "bots": return botsHome === "routines" ? <RoutineCalendarPage /> : <BotsHome />;
    // The Mobile page covers the sidebar and center from the workspace view, so the center stays empty beneath it.
    case "mobile": return null;
  }
}

export function ThreadWorkspaceCenter() {
  const { state } = useThreadCenterPorts();
  // With no thread open, the center shows the home for the sidebar's mode.
  const preferences = useContext(WorkspaceNavigationContext)?.preferences;
  const mode = preferences?.sidebarMode ?? "threads";
  const open = new Set(state.layout.openIds);
  // Keep open views mounted across workspace switches. Inactive panes are inert.
  const documents = state.layout.documents.filter((entry) => open.has(entry.id));
  const homeWorkspaceId = !state.layout.activeId && mode === "threads" ? state.layout.focusedWorkspaceId : null;
  return <SessionTabStack>
    {documents.map((document) => <SessionTabPane deferMount key={document.id} visible={state.layout.activeId === document.id}>
      {document.source?.kind === "app" ? <AppBuilderView documentId={document.id} /> : <ThreadViewContent documentId={document.id} />}</SessionTabPane>)}
    {!state.layout.activeId && <SidebarModeHome mode={mode} botsHome={preferences?.botsHome ?? "bots"} />}
    {/* The Inbox page lists the same waiting requests, so the tray steps aside while it is on screen. */}
    {!(mode === "inbox" && !state.layout.activeId) && <AttentionTray excludedWorkspaceId={homeWorkspaceId} />}
  </SessionTabStack>;
}
