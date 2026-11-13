import { useState } from "react";
import { LoaderCircle, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NativeThreadReferencesProps } from "@/components/app/types/threadReferences.types";
import { THREAD_REFERENCE_LIMIT } from "@shared/conversations/references";

export function NativeThreadReferences({ references, choices, disabled, onAttach }: NativeThreadReferencesProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const available = choices.filter((choice) => !references.some((reference) => reference.conversationId === choice.id)
    && `${choice.title} ${choice.workspace}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        disabled={disabled || saving || references.length >= THREAD_REFERENCE_LIMIT}>
        {saving ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <MessagesSquare className="size-3.5" aria-hidden="true" />}
        {saving ? "Attaching chat…" : "Attach chat"}
      </Button></PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <p className="text-sm font-medium">Attach a chat reference</p>
        <p className="text-xs text-muted-foreground">The agent can read this chat's saved history as needed. Later messages are not included in the snapshot.</p>
        <Input aria-label="Search chats to reference" placeholder="Search chats…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="max-h-64 space-y-1 overflow-y-auto" role="group" aria-label="Available chats">
          {available.slice(0, 50).map((choice) => <Button key={choice.id} type="button" variant="ghost" className="h-auto w-full justify-start px-2 py-2 text-left" disabled={disabled || saving}
            onClick={async () => { setSaving(true); try { await onAttach(choice.id); setOpen(false); setQuery(""); } finally { setSaving(false); } }}>
            <MessagesSquare className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0"><span className="block truncate">{choice.title}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">{choice.workspace}{choice.settled ? " · Settled" : ""}</span></span>
          </Button>)}
          {!available.length && <p role="status" className="p-2 text-xs text-muted-foreground">No matching chats are available.</p>}
          {available.length > 50 && <p className="p-2 text-xs text-muted-foreground">Search to find more chats.</p>}
        </div>
      </PopoverContent>
    </Popover>
  </>;
}
