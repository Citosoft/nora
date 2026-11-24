import { Loader2, AlertTriangle, KeyRound } from "lucide-react";
import { relative } from "@/components/app/logic/apps/formatValue";
import { useNow } from "@/components/app/hooks/useNow";
import type { SourceStateProps } from "@/components/app/types/apps.types";

/** Every data component shows loading, failure and sign-in states the same way, over whatever it last rendered, with when the data was fetched. */
export function SourceState({ state, onSignIn, onLoadMore, children }: SourceStateProps) {
  const now = useNow(30_000);
  if (!state || state.status === "idle" || (state.status === "loading" && !state.fetchedAt)) {
    return <div role="status" className="flex min-h-16 items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" aria-hidden="true" />Loading…</div>;
  }
  if (state.status === "error") {
    const Icon = state.kind === "needs-auth" ? KeyRound : AlertTriangle;
    return <div role="alert" className="flex min-h-16 flex-col items-start gap-2 text-xs">
      <p className="flex items-center gap-2 text-destructive"><Icon className="size-3.5 shrink-0" aria-hidden="true" /><span>{state.message}</span></p>
      {state.kind === "needs-auth" && onSignIn && <button type="button" className="rounded-md border px-2 py-1 text-xs hover:bg-muted" onClick={onSignIn}>Sign in</button>}
    </div>;
  }
  const fetched = state.fetchedAt ? new Date(state.fetchedAt) : null;
  return <div className={state.status === "loading" ? "opacity-60 transition-opacity" : undefined} aria-busy={state.status === "loading"}>
    {children}
    <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
      <span>{state.status === "loading" ? "Refreshing…" : fetched ? `Updated ${relative(fetched, Math.max(now, fetched.getTime()))}` : null}
        {state.status === "ready" && state.truncated && " · showing the first rows; narrow the source to see everything"}</span>
      {state.status === "ready" && state.hasMore && onLoadMore && <button type="button" onClick={onLoadMore} className="rounded border border-border/70 px-1.5 py-0.5 text-[10px] hover:bg-muted">Load more</button>}
    </p>
  </div>;
}
