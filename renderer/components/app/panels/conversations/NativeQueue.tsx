import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { NativeQueueProps } from "@/components/app/types/nativePanels.types";

export function NativeQueue({ conversationId, runs, paused, busy, execute }: NativeQueueProps) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  if (!runs.length) return null;
  return <section aria-label="Queued instructions" className="mb-4 space-y-3 rounded-lg border p-3">
    <h2 className="text-sm font-medium">{runs.length} queued {paused ? "· Paused" : ""}</h2>
    {runs.map((run) => <form key={run.id} className="space-y-2" onSubmit={(event) => {
      event.preventDefault(); void execute({ kind: "edit-queued", commandId: crypto.randomUUID(), conversationId, runId: run.id, instruction: edits[run.id] ?? run.instruction });
    }}><Textarea aria-label="Queued instruction" value={edits[run.id] ?? run.instruction} disabled={busy}
      onChange={(event) => setEdits((current) => ({ ...current, [run.id]: event.target.value }))} />
      <div className="flex gap-2"><Button type="submit" size="sm" disabled={busy || !(edits[run.id] ?? run.instruction).trim()}>Save edit</Button>
        <Button type="button" size="sm" disabled={busy} onClick={() => void execute({ kind: "remove-queued", commandId: crypto.randomUUID(), conversationId, runId: run.id })}>Remove</Button></div>
    </form>)}
    {paused && <Button disabled={busy} onClick={() => void execute({ kind: "continue-queue", commandId: crypto.randomUUID(), conversationId })}>Continue queue</Button>}
  </section>;
}
