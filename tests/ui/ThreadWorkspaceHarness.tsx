import type { ThreadRunState } from "@/components/app/types/thread-workspace/ports.types";
import { createRoot } from "react-dom/client";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { createThreadLayoutPersistence } from "@/components/app/logic/thread-workspace/persistence";
import { useThreadWorkspaceSnapshot } from "@/components/app/hooks/useThreadWorkspaceSnapshot";
import { ThreadWorkspaceComposition } from "@/components/app/views/ThreadWorkspaceComposition";
import { ThreadNavigation } from "@/components/app/panels/threads/ThreadNavigation";
import { ThreadTabs } from "@/components/app/panels/threads/ThreadTabs";
import { ThreadWorkspaceCenter } from "@/components/app/panels/threads/ThreadWorkspaceCenter";
import { threadWorkspaceFixture } from "../unit/renderer/threadWorkspaceFixtures";

const fixture = threadWorkspaceFixture();
const persistence = createThreadLayoutPersistence(localStorage, fixture.deps.boot.environmentId);
const store = createThreadWorkspaceStore({ ...fixture.deps, persistence, nextId: () => crypto.randomUUID() });
store.focusWorkspace("personal");
if (!store.snapshot().layout.documents.length) store.openDraft({ workspaceId: "personal" });

const fixtureStates: readonly ThreadRunState[] = ["awaiting-approval", "failed", "recovering", "interrupted", "completed"];

function FixtureControls() {
  const state = useThreadWorkspaceSnapshot(store);
  return <section aria-label="Acceptance controls" className="flex shrink-0 flex-wrap gap-3 border-t px-3 py-2 text-xs">
    <button id="run-background" onClick={() => {
      fixture.summaries[0].conversation.title = "A long background thread title that must stay on one row";
      fixture.summaries[0].latestRun = { id: "background-run", state: "running", createdAt: fixture.deps.now(), updatedAt: fixture.deps.now(), failure: null };
      void store.refresh();
    }}>Run background thread</button>
    <select id="fixture-status" aria-label="Fixture run state" defaultValue="completed" onChange={(event) => {
      const next = fixtureStates.find((entry) => entry === event.target.value);
      const run = fixture.summaries[0].latestRun;
      if (next && run) fixture.summaries[0].latestRun = { ...run, state: next };
      fixture.summaries[0].queuedCount = 0;
      fixture.summaries[0].conversation.queuePaused = false;
      void store.refresh();
    }}>{fixtureStates.map((entry) => <option key={entry}>{entry}</option>)}</select>
    <button id="pause-queue" onClick={() => {
      fixture.summaries[0].queuedCount = 1;
      fixture.summaries[0].conversation.queuePaused = true;
      void store.refresh();
    }}>Pause queue</button>
    <button id="request-input" onClick={() => {
      const run = fixture.summaries[0].latestRun;
      if (run) fixture.summaries[0].latestRun = { ...run, state: "awaiting-input" };
      void store.refresh();
    }}>Request input</button>
    <button id="finish-background" onClick={() => {
      fixture.summaries[0].conversation.title = "A long background thread title that must stay on one row";
      fixture.summaries[0].latestRun = { id: "background-run", state: "completed", createdAt: fixture.deps.now(), updatedAt: fixture.deps.now(), failure: null };
      void store.refresh();
    }}>Finish background thread</button>
    <button id="focus-window" onClick={() => store.setWindowFocused(true)}>Focus app</button>
    <button id="return-draft" onClick={() => { const draft = state.layout.documents.find((entry) => entry.target.kind === "draft"); if (draft) store.focusDocument(draft.id); }}>Return to draft</button>
    <button id="lose-reply" onClick={() => fixture.loseNextReply()}>Lose next reply</button>
    <output id="thread-fixture-state" className="sr-only">{JSON.stringify({ layout: state.layout, commands: fixture.commands, accepted: fixture.acceptedCount })}</output>
  </section>;
}

/** Region acceptance host only. Production keeps Nora's existing shell and launch flows until coherent cutover. */
export function ThreadWorkspaceHarness() {
  return <ThreadWorkspaceComposition store={store}><main className="flex h-screen min-h-0 flex-col bg-background text-foreground">
    <div className="flex min-h-0 flex-1"><aside className="flex w-60 shrink-0 flex-col border-r bg-muted/20"><div className="border-b px-4 py-4 text-sm font-medium">Personal</div><ThreadNavigation /></aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col"><ThreadTabs /><ThreadWorkspaceCenter /></div></div><FixtureControls />
  </main></ThreadWorkspaceComposition>;
}
const root = document.getElementById("app");
if (!root) throw new Error("Thread acceptance root is missing");
createRoot(root).render(<ThreadWorkspaceHarness />);
