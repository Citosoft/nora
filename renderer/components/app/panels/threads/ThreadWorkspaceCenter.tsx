import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { useWorkspaceHome } from "@/components/app/hooks/useWorkspaceHome";
import { WorkspaceHome } from "../workspace-home/WorkspaceHome";
import { SessionTabPane, SessionTabStack } from "../SessionTabStack";
import { ThreadViewContent } from "./ThreadViewContent";

function WorkspaceHomeSurface() {
  const home = useWorkspaceHome();
  return <WorkspaceHome {...home} />;
}

export function ThreadWorkspaceCenter() {
  const { state } = useThreadCenterPorts();
  const open = new Set(state.layout.openIds);
  // Keep open views mounted across workspace switches. Inactive panes are inert.
  const documents = state.layout.documents.filter((entry) => open.has(entry.id));
  return <SessionTabStack>
    {documents.map((document) => <SessionTabPane key={document.id} visible={state.layout.activeId === document.id}><ThreadViewContent documentId={document.id} /></SessionTabPane>)}
    {!state.layout.activeId && <WorkspaceHomeSurface />}
  </SessionTabStack>;
}
