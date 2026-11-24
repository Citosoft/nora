import type { ExternalThreadControlsProps } from "@/components/app/types/externalSessions.types";

export function ExternalThreadControls({ state }: ExternalThreadControlsProps) {
  if (!state.loading && !state.errors.length) return null;
  return <div className="space-y-1">
    {state.loading && <p role="status" className="px-2 text-xs text-muted-foreground">Finding threads…</p>}
    {state.errors.map((message) => <p key={message} role="alert" className="px-2 py-1 text-xs text-destructive">{message}</p>)}
  </div>;
}
