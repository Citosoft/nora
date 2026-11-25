import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TurnUndoUnavailableReason } from "@shared/types/conversation/turnUndo.types";
import type { TurnUndoPartProps } from "@/components/app/types/turnUndo.types";

const UNAVAILABLE: Record<TurnUndoUnavailableReason, string> = {
  expired: "This turn's snapshots are no longer kept, so it can't be undone.",
  "later-turn": "A later turn changed the same files. Undo that turn first.",
  busy: "Wait for the current turn to finish."
};

const files = (count: number): string => `${count} ${count === 1 ? "file" : "files"}`;

/** The header control for undoing a turn's file changes, confirmed in a popover. */
export function TurnUndoButton({ undo, fileCount }: TurnUndoPartProps) {
  const [confirming, setConfirming] = useState(false);
  const { availability } = undo;
  switch (availability.kind) {
    case "none": return null;
    case "undone": return <Badge variant="outline">Undone</Badge>;
    case "pending": return <Button type="button" variant="ghost" size="sm" disabled>Undoing…<Undo2 className="size-3.5" aria-hidden="true" /></Button>;
    case "unavailable": return <Button type="button" variant="ghost" size="sm" disabled aria-label={`Undo unavailable. ${UNAVAILABLE[availability.reason]}`}
      tooltip={UNAVAILABLE[availability.reason]}>Undo<Undo2 className="size-3.5" aria-hidden="true" /></Button>;
    case "available": return <Popover open={confirming} onOpenChange={setConfirming}>
      <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm">Undo<Undo2 className="size-3.5" aria-hidden="true" /></Button></PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 text-sm">
        <p>Put {files(fileCount)} back the way {fileCount === 1 ? "it was" : "they were"} before this turn? The conversation is kept.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button type="button" size="sm" onClick={() => { setConfirming(false); undo.onUndo("all"); }}>Undo changes</Button>
        </div>
      </PopoverContent>
    </Popover>;
  }
}
