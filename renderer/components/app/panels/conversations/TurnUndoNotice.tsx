import { Button } from "@/components/ui/button";
import { FilePathLabel } from "@/components/app/shared/FilePathLabel";
import type { TurnUndoConflict } from "@shared/types/conversation/turnUndo.types";
import type { TurnUndoPartProps } from "@/components/app/types/turnUndo.types";

const REASONS: Record<TurnUndoConflict["reason"], string> = {
  edited: "Changed since this turn",
  unrestorable: "Too large to have been saved"
};

const files = (count: number): string => `${count} ${count === 1 ? "file" : "files"}`;

function ConflictList({ conflicts }: { conflicts: readonly TurnUndoConflict[] }) {
  return <ul className="mt-2 space-y-1">{conflicts.map((conflict) => <li key={conflict.path} className="flex min-w-0 items-center gap-3">
    <FilePathLabel path={conflict.path} className="flex-1" /><span className="shrink-0 text-xs text-muted-foreground">{REASONS[conflict.reason]}</span>
  </li>)}</ul>;
}

/** What the last undo of this turn did, and how to continue when it could not restore everything. */
export function TurnUndoNotice({ undo, fileCount }: TurnUndoPartProps) {
  const { state, availability } = undo;
  const canAct = availability.kind === "available";
  if (!state || state.status === "pending" || state.status === "expired") return null;
  const frame = "border-b border-border px-4 py-3 text-sm";
  switch (state.status) {
    case "undone": return <div role="status" className={frame}>
      <p>Restored {files(state.restored.length)} to how {state.restored.length === 1 ? "it was" : "they were"} before this turn.
        {state.skipped.length > 0 && ` Left ${files(state.skipped.length)} as they are:`}</p>
      {state.skipped.length > 0 && <ConflictList conflicts={state.skipped} />}
    </div>;
    case "blocked": {
      const rest = fileCount - state.conflicts.length;
      return <div role="alert" className={frame}>
        <p>Nothing was undone because {files(state.conflicts.length)} can't be restored:</p>
        <ConflictList conflicts={state.conflicts} />
        {canAct && rest > 0 && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => undo.onUndo("unconflicted")}>
          Restore the other {files(rest)}</Button>}
      </div>;
    }
    case "failed": return <div role="alert" className={frame}>
      <p className="text-destructive">{state.message}</p>
      {canAct && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => undo.onUndo("all")}>Try again</Button>}
    </div>;
  }
}
