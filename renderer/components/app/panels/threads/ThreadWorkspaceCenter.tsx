import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { useWorkspaceHome } from "@/components/app/hooks/useWorkspaceHome";
import { WorkspaceHome } from "../workspace-home/WorkspaceHome";
import { WorkspaceHomeCommands } from "../workspace-home/WorkspaceHomeCommands";
import { SessionTabPane, SessionTabStack } from "../SessionTabStack";
import { ThreadViewContent } from "./ThreadViewContent";
import { useContext } from "react";
import { WorkspaceNavigationContext } from "@/components/app/context/workspaceNavigationContext";
import { BotsHome } from "../bots/BotsHome";
import { AttentionTray } from "./AttentionTray";

function WorkspaceHomeSurface() {
  const home = useWorkspaceHome();
  return <WorkspaceHome {...home} commands={home.workspace?.shellProjectId
    ? <WorkspaceHomeCommands key={home.workspace.shellProjectId} projectId={home.workspace.shellProjectId} /> : null} />;
}

export function ThreadWorkspaceCenter() {
  const { state } = useThreadCenterPorts();
  // With no thread open, the center shows the home for the sidebar's mode.
  const botsMode = useContext(WorkspaceNavigationContext)?.preferences.sidebarMode === "bots";
  const open = new Set(state.layout.openIds);
  // Keep open views mounted across workspace switches. Inactive panes are inert.
  const documents = state.layout.documents.filter((entry) => open.has(entry.id));
  return <SessionTabStack>
    {documents.map((document) => <SessionTabPane key={document.id} visible={state.layout.activeId === document.id}><ThreadViewContent documentId={document.id} /></SessionTabPane>)}
    {!state.layout.activeId && (botsMode ? <BotsHome /> : <WorkspaceHomeSurface />)}
    <AttentionTray />
  </SessionTabStack>;
}
