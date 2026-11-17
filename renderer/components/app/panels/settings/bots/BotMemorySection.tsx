import { RefreshCcw } from "lucide-react";
import { notesForMemoryScope } from "@/components/app/logic/workspaceMemory";
import { useId, useState } from "react";
import { BOT_MEMORY_TEXT_MAX } from "@shared/bots/contracts";
import { useBotMemory } from "@/components/app/hooks/useBotMemory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BotMemoryNote } from "./BotMemoryNote";
import type { BotMemorySectionProps } from "@/components/app/types/botMemory.types";
import { NOTE_SOURCE_LABELS } from "@/components/app/constants/botMemorySources";

/** The bot's notes: what it saved with remember plus anything the user adds, all visible and editable here. */
export function BotMemorySection({ botId, botName, scope, disabled }: BotMemorySectionProps) {
  const memory = useBotMemory(botId);
  const headingId = useId();
  const [text, setText] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const workspaces = scope.kind === "workspace" ? [scope.workspace] : scope.workspaces;
  const currentWorkspace = scope.kind === "workspace" ? scope.workspace : scope.currentWorkspace;
  const notes = notesForMemoryScope(memory.notes, scope);
  const scopeLabel = (id: string | null): string => id ? workspaces.find((entry) => entry.id === id)?.name ?? "A removed workspace" : "Everywhere";
  const locked = disabled || memory.busy;
  const add = (): void => {
    if (!text.trim() || locked) return;
    void memory.add(text, scope.kind === "workspace" ? scope.workspace.id : workspaceId || null).then((added) => { if (added) setText(""); });
  };
  return <section aria-labelledby={headingId} className={scope.kind === "workspace" ? "flex min-h-0 flex-1 flex-col gap-3" : "space-y-2"}>
    <div className="flex shrink-0 items-start gap-2"><div className="min-w-0 flex-1"><h3 id={headingId} className="text-sm font-medium">Memory</h3>
      <p className="text-xs text-muted-foreground">Notes {botName} saved or you added. They're included as context in new turns and never change what {botName} is allowed to do.</p></div>
      <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Refresh memory" disabled={locked} onClick={() => void memory.refresh()}>
        <RefreshCcw className={memory.busy ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" />
      </Button></div>
    {memory.loading ? <p role="status" className="text-xs text-muted-foreground">Loading notes…</p>
      : notes.length ? <ul className={scope.kind === "workspace" ? "min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/60" : "max-h-56 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/60"}>
        {notes.map((note) => <BotMemoryNote key={note.id} text={note.text} scope={scopeLabel(note.workspaceId)} disabled={locked}
          source={NOTE_SOURCE_LABELS[note.source.kind](botName)} onSave={(next) => memory.update(note.id, next)} onRemove={() => void memory.remove(note.id)} />)}
      </ul> : <p className="text-xs text-muted-foreground">{scope.kind === "workspace" ? `${botName} has no memories for ${scope.workspace.name} yet.` : "No notes yet."}</p>}
    {/* Rendered inside the bot editor's form, so this is a group with its own Enter handling rather than a nested form. */}
    <div role="group" aria-label="Add a note" className="flex shrink-0 flex-wrap gap-2">
      <Input aria-label={`Add a note for ${botName}`} className="min-w-0 flex-1" value={text} maxLength={BOT_MEMORY_TEXT_MAX} disabled={locked}
        placeholder={scope.kind === "workspace" ? "Something Nora should remember here" : "Prefers British spelling"} onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); add(); } }} />
      {scope.kind === "all" && currentWorkspace && <Select aria-label="Where the note applies" value={workspaceId} disabled={locked} onChange={(event) => setWorkspaceId(event.target.value)}>
        <option value="">Everywhere</option><option value={currentWorkspace.id}>Only in {currentWorkspace.name}</option></Select>}
      <Button type="button" variant="outline" size="sm" disabled={locked || !text.trim()} onClick={add}>Add note</Button>
    </div>
    {memory.error && <p role="alert" className="text-xs text-destructive">{memory.error}</p>}
  </section>;
}
