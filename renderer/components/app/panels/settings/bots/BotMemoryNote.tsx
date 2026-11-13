import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { BOT_MEMORY_TEXT_MAX } from "@shared/bots/contracts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { BotMemoryNoteProps } from "@/components/app/types/botMemory.types";

export function BotMemoryNote({ text, scope, source, disabled, onSave, onRemove }: BotMemoryNoteProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  if (editing) {
    return <li className="space-y-2 px-3 py-2">
      <Textarea aria-label="Edit note" value={draft} maxLength={BOT_MEMORY_TEXT_MAX} rows={2} disabled={disabled} autoFocus onChange={(event) => setDraft(event.target.value)} />
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => { setDraft(text); setEditing(false); }}>Cancel</Button>
        <Button type="button" size="sm" disabled={disabled || !draft.trim()} onClick={() => void onSave(draft).then((saved) => { if (saved) setEditing(false); })}>Save note</Button>
      </div>
    </li>;
  }
  return <li className="group flex items-start gap-2 px-3 py-2">
    <div className="min-w-0 flex-1"><p className="whitespace-pre-wrap break-words text-sm">{text}</p>
      <p className="text-xs text-muted-foreground">{scope} · {source}</p></div>
    <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" aria-label="Edit note" disabled={disabled} onClick={() => setEditing(true)}>
      <Pencil className="size-3.5" aria-hidden="true" /></Button>
    <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" aria-label="Delete note" disabled={disabled} onClick={onRemove}>
      <Trash2 className="size-3.5" aria-hidden="true" /></Button>
  </li>;
}
