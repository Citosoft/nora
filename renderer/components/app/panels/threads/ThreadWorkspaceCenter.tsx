import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { useWorkspaceHome } from "@/components/app/hooks/useWorkspaceHome";
import { WorkspaceHome } from "../workspace-home/WorkspaceHome";
import { WorkspaceHomeCommands } from "../workspace-home/WorkspaceHomeCommands";
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

function WorkspaceHomeSurface() {
  const home = useWorkspaceHome();
  return <WorkspaceHome {...home} commands={home.workspace?.shellProjectId
    ? <WorkspaceHomeCommands key={home.workspace.shellProjectId} projectId={home.workspace.shellProjectId} /> : null} />;
}

export function ThreadWorkspaceCenter() {
  const { state } = useThreadCenterPorts();
  // With no thread open, the center shows the home for the sidebar's mode.
  const preferences = useContext(WorkspaceNavigationContext)?.preferences;
  const mode = preferences?.sidebarMode ?? "threads";
  const open = new Set(state.layout.openIds);
  // Keep open views mounted across workspace switches. Inactive panes are inert.
  const documents = state.layout.documents.filter((entry) => open.has(entry.id));
  return <SessionTabStack>
    {documents.map((document) => <SessionTabPane key={document.id} visible={state.layout.activeId === document.id}>
      {document.source?.kind === "app" ? <AppBuilderView documentId={document.id} /> : <ThreadViewContent documentId={document.id} />}</SessionTabPane>)}
    {!state.layout.activeId && (mode === "inbox" ? <InboxPage /> : mode === "apps" ? <AppsCenter /> : mode === "threads" ? <WorkspaceHomeSurface />
      : preferences?.botsHome === "routines" ? <RoutineCalendarPage /> : <BotsHome />)}
    {/* The Inbox page lists the same waiting requests, so the tray steps aside while it is on screen. */}
    {!(mode === "inbox" && !state.layout.activeId) && <AttentionTray />}
  </SessionTabStack>;
}
