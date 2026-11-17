import { useLayoutEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { QueuedInstructionRowProps } from "@/components/app/types/nativePanels.types";

export function QueuedInstructionRow({ run, position, conversationId, busy, execute, steerTarget }: QueuedInstructionRowProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useLayoutEffect(() => {
    if (draft === null && restoreFocus.current) { restoreFocus.current = false; trigger.current?.focus(); }
  }, [draft]);
  const disabled = busy || submitting || run.steering === "pending";
  const closeEditor = (): void => {
    restoreFocus.current = true;
    setDraft(null); setError(null);
  };
  const commit = async (kind: "edit-queued" | "remove-queued" | "steer-queued"): Promise<void> => {
    if (disabled || (kind === "edit-queued" && !draft?.trim())) return;
    if (kind === "steer-queued" && (!steerTarget || run.steering)) return;
    setSubmitting(true); setError(null);
    try {
      const command = { commandId: crypto.randomUUID(), conversationId, runId: run.id };
      await execute(kind === "edit-queued" ? { ...command, kind, instruction: draft ?? run.instruction }
        : kind === "steer-queued" && steerTarget ? { ...command, kind, targetRunId: steerTarget } : { ...command, kind: "remove-queued" });
      if (kind === "edit-queued") closeEditor();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The queued message could not be updated."); }
    finally { setSubmitting(false); }
  };
  return <li className="group/queued px-3 py-1" aria-label={`Queued message ${position}`}>
    {draft === null ? <div className="flex h-7 min-w-0 items-center gap-2">
      <span className="w-4 shrink-0 text-center text-[10px] tabular-nums text-muted-foreground/60" aria-hidden="true">{position}</span>
      <button ref={trigger} type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" aria-label={`Edit queued message ${position}`} title={run.instruction} disabled={disabled || !!run.steering} onClick={() => { setDraft(run.instruction); setError(null); }}><span className="min-w-0 flex-1 truncate">{run.instruction}</span><Pencil className="size-3 shrink-0 sm:opacity-0 sm:group-hover/queued:opacity-100 sm:group-focus-within/queued:opacity-100" aria-hidden="true" /></button>
      {run.steering && <span role="status" className="shrink-0 text-[10px] text-muted-foreground">{run.steering === "pending" ? "Steering…" : "Unconfirmed"}</span>}
      {steerTarget && !run.steering && <Button type="button" variant="ghost" size="sm" className="h-6 shrink-0 px-1.5 text-[10px]" aria-label={`Steer queued message ${position}`} tooltip="Send this message to the current turn now" disabled={disabled} onClick={() => void commit("steer-queued")}>Steer</Button>}
      <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0 text-muted-foreground sm:opacity-0 sm:group-hover/queued:opacity-100 sm:group-focus-within/queued:opacity-100" aria-label={`Remove queued message ${position}`} disabled={disabled} onClick={() => void commit("remove-queued")}><X className="size-3" aria-hidden="true" /></Button>
    </div> : <form className="flex items-start gap-2 py-1" onSubmit={(event) => { event.preventDefault(); void commit("edit-queued"); }}>
      <Textarea autoFocus aria-label={`Queued message ${position} text`} className="min-h-16 max-h-32 resize-y text-xs" value={draft} disabled={disabled} onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Escape" && !disabled) { event.preventDefault(); closeEditor(); }
          else if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void commit("edit-queued"); } }} />
      <div className="flex shrink-0 gap-0.5"><Button type="submit" variant="ghost" size="icon" className="size-7" disabled={disabled || !draft.trim()} aria-label={`Save queued message ${position}`}><Check className="size-3.5" aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon" className="size-7" disabled={disabled} aria-label={`Cancel editing queued message ${position}`} onClick={closeEditor}><X className="size-3.5" aria-hidden="true" /></Button></div>
    </form>}
    {(error || run.failure) && <p role="alert" className="pb-1 pl-6 text-xs text-destructive">{error ?? run.failure?.message}</p>}
  </li>;
}
