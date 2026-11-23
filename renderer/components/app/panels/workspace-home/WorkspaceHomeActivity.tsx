import { Button } from "@/components/ui/button";
import { AttentionTrayRow } from "../threads/AttentionTrayRow";
import { WorkspaceHomeThreadSection } from "./WorkspaceHomeThreadSection";
import type { WorkspaceHomeActivityProps } from "@/components/app/types/workspace-home/home.types";

export function WorkspaceHomeActivity({ workspace, activity, requests, providerLabels, loading, error, onOpenThread, onRetry }: WorkspaceHomeActivityProps) {
  const now = Date.now();
  const shown = requests.toasts.length + activity.needsYou.length + activity.inProgress.length + activity.recent.length;
  const answerable = requests.toasts.length ? {
    count: requests.toasts.length,
    node: <ul aria-label="Requests waiting for you" className="divide-y border-b last:border-0">{requests.toasts.map((toast) => <AttentionTrayRow key={toast.request.id} toast={toast}
      onRespond={(response) => requests.respond(toast, response)} onOpen={() => requests.open(toast)} />)}</ul>
  } : undefined;
  const section = { providerLabels, now, onOpenThread };
  return <div className="flex min-w-0 flex-col gap-6">
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"><span>{error}</span><Button size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>}
    <WorkspaceHomeThreadSection id="needs-you" title="Needs you" tone="attention" rows={activity.needsYou} leading={answerable} {...section} />
    <WorkspaceHomeThreadSection id="in-progress" title="In progress" rows={activity.inProgress} {...section} />
    <WorkspaceHomeThreadSection id="recent" title="Pick up where you left off" rows={activity.recent} {...section} />
    {!shown && <div role="status" className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {loading ? "Loading workspace activity…" : error ? "Workspace activity couldn’t be loaded." : !workspace ? "Choose a workspace from the sidebar to get started."
        : activity.total ? "Everything here is settled. Settled threads are in the sidebar." : "A fresh start. Your threads will appear here as you work."}
    </div>}
    {shown > 0 && activity.hidden > 0 && <p className="text-xs text-muted-foreground">{activity.hidden} more {activity.hidden === 1 ? "thread" : "threads"} in the sidebar, including settled ones</p>}
  </div>;
}
