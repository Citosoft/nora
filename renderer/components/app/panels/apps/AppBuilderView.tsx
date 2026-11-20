import { AppBuilderPickContext } from "@/components/app/context/appBuilderPickContext";
import { useAppBuilderState } from "@/components/app/hooks/useAppBuilderState";
import type { AppBuilderViewProps } from "@/components/app/types/apps.types";
import { AppBuilderBar } from "./AppBuilderBar";
import { AppBuilderDrawer } from "./AppBuilderDrawer";
import { AppBuildingScene } from "./AppBuildingScene";
import { AppView } from "./AppView";

/**
 * An app being built: while a turn runs the building scene takes the stage and the thread stays hidden; when it finishes the app
 * is revealed with a bar for the next change. The chat slides in from the right on request, or by itself when the agent needs an
 * answer, and slides away again with every prompt.
 */
export function AppBuilderView({ documentId }: AppBuilderViewProps) {
  const builder = useAppBuilderState(documentId);
  const { app, phase, threadOpen } = builder;
  const building = phase.kind !== "ready";
  // A change to an existing app keeps it in view, dimmed, under the scene; a first build has nothing to show yet.
  const stage = app && !building ? <AppBuilderPickContext.Provider value={builder.pick}><AppView key={app.id} appId={app.id} inBuilder /></AppBuilderPickContext.Provider>
    : <div className="relative flex min-h-0 flex-1 flex-col">
      {app && <div className="app-building-backdrop pointer-events-none flex min-h-0 flex-1 flex-col" aria-hidden="true"><AppView appId={app.id} inBuilder /></div>}
      <div className={app ? "absolute inset-0 flex flex-col bg-background/70 backdrop-blur-[2px]" : "flex min-h-0 flex-1 flex-col"}>
        <AppBuildingScene phase={phase.kind === "ready" ? { kind: "building" } : phase} step={builder.step} startedAt={builder.startedAt} update={!!app} onOpenThread={() => builder.setThreadOpen(true)} onStop={builder.stop} stopping={builder.stopping} />
      </div>
    </div>;
  return <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-app-builder="true">
    <div className={`flex min-h-0 flex-1 flex-col ${!building && app ? "app-reveal" : ""}`} key={phase.kind}>{stage}</div>
    <AppBuilderBar busy={phase.kind === "building"} threadOpen={threadOpen} draft={builder.draft} suggestions={app && !building ? app.suggestions : []} onSend={builder.send} onToggleThread={() => builder.setThreadOpen(!threadOpen)} />
    <AppBuilderDrawer documentId={documentId} open={threadOpen} onClose={() => builder.setThreadOpen(false)} />
  </div>;
}
