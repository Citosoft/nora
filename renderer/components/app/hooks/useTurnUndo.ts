import { useMemo } from "react";
import { turnUndoAvailability } from "@shared/conversations/turnUndo";
import type { TurnUndoControls, TurnUndoInput } from "@/components/app/types/turnUndo.types";

/** Undo for a thread's reviewed turns: availability is derived from the transcript, and undoing goes through thread commands. */
export function useTurnUndo({ conversationId, items, runs, execute }: TurnUndoInput): TurnUndoControls | undefined {
  return useMemo(() => conversationId ? {
    availability: (itemId: string) => turnUndoAvailability(items, runs, itemId),
    undo: (runId: string, mode) => { void execute({ kind: "undo-turn", commandId: crypto.randomUUID(), conversationId, runId, mode }); }
  } satisfies TurnUndoControls : undefined, [conversationId, items, runs, execute]);
}
