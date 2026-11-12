import { createRoot } from "react-dom/client";
import { useThreadWorkspaceSnapshot } from "@/components/app/hooks/useThreadWorkspaceSnapshot";
import { useThreadPullRequests } from "@/components/app/hooks/useThreadPullRequests";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { ThreadRow } from "@/components/app/panels/threads/ThreadRow";
import type { BranchRequestReader } from "@/components/app/types/threadInsights.types";
import { threadWorkspaceFixture } from "../unit/renderer/threadWorkspaceFixtures";

const fixture = threadWorkspaceFixture();
fixture.summaries[0].conversation.workspace = { ...fixture.deps.boot.workspaces[1].workspace, branch: "feature" };
const store = createThreadWorkspaceStore(fixture.deps);
let linked = true;
let reads = 0;
const readRequest: BranchRequestReader = async (_projectId, branch) => {
  reads++;
  return linked ? { branch, branchExistsOnRemote: true, state: "open", label: "Open", pullRequestNumber: 42, webUrl: "https://example.com/pulls/42" } : null;
};
void store.refresh();

export function ThreadRequestsHarness() {
  const state = useThreadWorkspaceSnapshot(store);
  const rows = buildThreadNavigation(state, "project", "all");
  const requests = useThreadPullRequests(state, rows.map((row) => row.id), readRequest);
  return <main className="h-screen bg-background p-8 text-foreground">
    <div className="w-60" aria-label="PR threads">{rows.map((row) => <ThreadRow key={row.id} row={row} workspace={null} request={requests[row.id] ?? null} onOpen={(entry) => store.openThread(entry.id)} onTogglePin={(entry) => { if (entry.target.kind === "thread") store.togglePin(entry.target.conversationId); }} />)}</div>
    <button id="running" onClick={() => { fixture.summaries[0].latestRun = { id: "run", state: "running", createdAt: fixture.deps.now(), updatedAt: fixture.deps.now(), failure: null }; void store.refresh(); }}>Run</button>
    <button id="unlink" onClick={() => { linked = false; window.dispatchEvent(new Event("focus")); }}>Unlink</button>
    <output>{reads}</output>
  </main>;
}
const root = document.getElementById("app");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<ThreadRequestsHarness />);
