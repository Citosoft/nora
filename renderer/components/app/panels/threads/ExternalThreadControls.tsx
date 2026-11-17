import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExternalThreadControlsProps } from "@/components/app/types/externalSessions.types";

export function ExternalThreadControls({ state }: ExternalThreadControlsProps) {
  return <div className="space-y-1">
    <div className="flex items-center gap-1 px-1">
      {state.total > 5 && <Button type="button" variant="ghost" size="sm" className="h-7 flex-1 justify-start px-1 text-xs" aria-expanded={state.expanded}
        onClick={state.toggleExpanded}>{state.expanded ? "Show less" : `Show more (${state.hidden})`}</Button>}
      <Button variant="ghost" size="icon" className="ml-auto size-6 text-muted-foreground" aria-label="Refresh resumable threads"
        disabled={state.loading || state.busy} onClick={state.refresh}><RefreshCw className={`size-3 ${state.loading ? "animate-spin" : ""}`} aria-hidden="true" /></Button>
    </div>
    {state.loading && <p role="status" className="px-2 text-xs text-muted-foreground">Finding threads…</p>}
    {state.errors.map((message) => <p key={message} role="alert" className="px-2 py-1 text-xs text-destructive">{message}</p>)}
  </div>;
}
