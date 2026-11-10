import { Button } from "@/components/ui/button";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { SessionTabPane, SessionTabStack } from "../SessionTabStack";
import { ThreadViewContent } from "./ThreadViewContent";

export function ThreadWorkspaceCenter() {
  const { state, store } = useThreadCenterPorts();
  const open = new Set(state.layout.openIds);
  // Keep open views mounted across workspace switches. Inactive panes are inert.
  const documents = state.layout.documents.filter((entry) => open.has(entry.id));
  return <SessionTabStack>
    {documents.map((document) => <SessionTabPane key={document.id} visible={state.layout.activeId === document.id}><ThreadViewContent documentId={document.id} /></SessionTabPane>)}
    {!state.layout.activeId && <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"><h1 className="text-xl font-medium">A place for your next task</h1>
      <p className="text-sm text-muted-foreground">Open a thread or start something new.</p><Button disabled={!state.layout.focusedWorkspaceId} onClick={() => { if (state.layout.focusedWorkspaceId) store.openDraft({ workspaceId: state.layout.focusedWorkspaceId }); }}>New thread</Button></div>}
  </SessionTabStack>;
}
