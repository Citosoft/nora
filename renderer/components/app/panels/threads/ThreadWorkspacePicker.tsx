import { useState } from "react";
import { Check, ChevronDown, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ThreadWorkspacePickerProps } from "@/components/app/types/thread-workspace/ports.types";

export function ThreadWorkspacePicker({ workspace, workspaces, disabled, onSelect }: ThreadWorkspacePickerProps) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button size="sm" variant="ghost" disabled={disabled} className="max-w-full gap-2 px-2 font-normal" aria-label="Choose thread workspace">
    <Folder className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{workspace.name}</span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
  </Button></PopoverTrigger>
    <PopoverContent side="top" aria-label="Choose thread workspace" className="w-[min(23rem,calc(100vw-1.5rem))] bg-popover p-2">
      <h2 className="px-3 pb-2 pt-1 text-xs font-medium text-muted-foreground">Workspace</h2>
      <div className="max-h-72 space-y-1 overflow-y-auto">{workspaces.map((entry) => <button type="button" key={entry.id} aria-pressed={entry.id === workspace.id}
        onClick={() => { onSelect(entry.id); setOpen(false); }} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${entry.id === workspace.id ? "bg-secondary" : "hover:bg-muted"}`}>
        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm">{entry.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{entry.workspace.environmentId}{entry.workspace.versionControl === "git" ? ` · ${entry.workspace.branch || "Detached HEAD"}` : ""}</span></span>
        {entry.id === workspace.id && <Check className="size-4 shrink-0" aria-hidden="true" />}
      </button>)}</div>
    </PopoverContent>
  </Popover>;
}
