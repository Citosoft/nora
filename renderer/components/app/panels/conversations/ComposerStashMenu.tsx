import { useState } from "react";
import { Archive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ComposerStashMenuProps } from "@/components/app/types/composerPrompts.types";

/** Lists stashed prompts under the composer; only shown while something is stashed. */
export function ComposerStashMenu({ entries, disabled, shortcut, onRestore, onRemove }: ComposerStashMenuProps) {
  const [open, setOpen] = useState(false);
  if (!entries.length) return null;
  const label = `${entries.length} stashed ${entries.length === 1 ? "prompt" : "prompts"}`;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs font-normal text-muted-foreground" disabled={disabled}
        tooltip={shortcut ? `Stashed prompts · ${shortcut} stashes the draft, or restores the latest when the composer is empty` : "Stashed prompts"}>
        <Archive className="size-3" aria-hidden="true" />{label}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" side="top" className="w-[min(26rem,calc(100vw-2rem))] p-1" aria-label="Stashed prompts">
      <ul className="max-h-72 overflow-y-auto">
        {entries.map((entry) => <li key={entry.id} className="group flex items-start gap-1 rounded-md hover:bg-accent">
          <button type="button" className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={() => { onRestore(entry.id); setOpen(false); }}>
            <span className="line-clamp-2 whitespace-pre-wrap break-words text-sm">{entry.text}</span>
            <time dateTime={entry.stashedAt} className="text-[10px] text-muted-foreground">{new Date(entry.stashedAt).toLocaleString()}</time>
          </button>
          <Button type="button" variant="ghost" size="icon" className="mt-1 size-6 shrink-0 text-muted-foreground" aria-label="Delete stashed prompt"
            onClick={() => onRemove(entry.id)}><X className="size-3.5" aria-hidden="true" /></Button>
        </li>)}
      </ul>
    </PopoverContent>
  </Popover>;
}
