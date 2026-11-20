import { AlertTriangle, MessageSquare, Sparkles, Square } from "lucide-react";
import { buildStepLine } from "@/components/app/logic/apps/buildSteps";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import type { AppBuildingSceneProps } from "@/components/app/types/appsBuilder.types";
import { Button } from "@/components/ui/button";

const elapsed = (startedAt: string | null, now: number): string => {
  if (!startedAt) return "";
  const seconds = Math.max(0, Math.round((now - Date.parse(startedAt)) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

/**
 * What the user sees while the builder works: a soft glow, placeholder blocks drifting into place and one line saying what is
 * happening. The thread stays out of sight; it opens itself only when the agent needs an answer or fails.
 */
export function AppBuildingScene({ phase, step, startedAt, update, onOpenThread, onStop, stopping }: AppBuildingSceneProps) {
  const now = useThreadTime();
  const failed = phase.kind === "failed";
  const attention = phase.kind === "attention";
  return <div className="app-building-scene relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-8 text-center" role="status" aria-live="polite">
    {!failed && <div className="app-building-blocks pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: 6 }, (_entry, index) => <span key={index} className="app-building-block" style={{ animationDelay: `${index * 0.35}s` }} />)}
    </div>}
    <div className="relative flex max-w-md flex-col items-center gap-4">
      <span className={`app-building-orb flex size-14 items-center justify-center rounded-full ${failed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
        {failed ? <AlertTriangle className="size-6" aria-hidden="true" /> : <Sparkles className="size-6" aria-hidden="true" />}
      </span>
      {failed ? <>
        <p className="text-lg font-medium">The build stopped</p>
        <p className="text-sm text-muted-foreground">{phase.message}</p>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onOpenThread}><MessageSquare className="size-3.5" aria-hidden="true" />Open chat</Button>
      </> : attention ? <>
        <p className="text-lg font-medium">Nora needs you</p>
        <p className="text-sm text-muted-foreground">The builder is waiting on an answer in the chat.</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" className="gap-1.5" onClick={onOpenThread}><MessageSquare className="size-3.5" aria-hidden="true" />Answer in chat</Button>
          {onStop && <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onStop}><Square className="size-3 fill-current" aria-hidden="true" />Stop</Button>}
        </div>
      </> : <>
        <p className="text-lg font-medium">{update ? "Changing your app" : "Building your app"}</p>
        <p key={buildStepLine(step, update)} className="app-building-line text-sm text-muted-foreground">{buildStepLine(step, update)}</p>
        <p className="text-xs tabular-nums text-muted-foreground/70">{elapsed(startedAt, now)}</p>
        {(onStop || stopping) && <Button type="button" variant="outline" size="sm" className="mt-2 gap-1.5" disabled={stopping || !onStop} onClick={onStop ?? undefined}>
          <Square className="size-3 fill-current" aria-hidden="true" />{stopping ? "Stopping…" : update ? "Stop and keep the app as it was" : "Stop building"}</Button>}
      </>}
    </div>
  </div>;
}
