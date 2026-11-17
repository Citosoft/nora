import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NativeQueueProps } from "@/components/app/types/nativePanels.types";
import { QueuedInstructionRow } from "./QueuedInstructionRow";

export function NativeQueue({ conversationId, runs, paused, busy, execute, steerTarget }: NativeQueueProps) {
  if (!runs.length) return null;
  return <section aria-label="Queued instructions" className="mx-4 overflow-hidden rounded-t-lg border border-b-0 border-border/60 bg-card/70 sm:mx-8">
    <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-[10px] text-muted-foreground"><h2>{runs.length} queued{paused ? " · Paused" : ""}</h2>
      {paused && <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[10px]" disabled={busy} onClick={() => void execute({ kind: "continue-queue", commandId: crypto.randomUUID(), conversationId })}><Play className="size-3" aria-hidden="true" />Continue queue</Button>}
    </div>
    <ol className="max-h-48 divide-y divide-border/40 overflow-y-auto pb-1">{runs.map((run, index) => <QueuedInstructionRow key={run.id} run={run} position={index + 1} conversationId={conversationId} busy={busy} execute={execute} steerTarget={steerTarget} />)}</ol>
  </section>;
}
