import { useState } from "react";
import { Check, GitBranch, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ThreadWorkspacePickerProps } from "@/components/app/types/thread-workspace/ports.types";

/** Choose admitted checkouts, never mutate a bound thread's branch or accept an arbitrary path. */
export function ThreadCheckoutPicker({ workspace, workspaces, disabled, onSelect }: ThreadWorkspacePickerProps) {
  const [open, setOpen] = useState(false);
  if (workspace.workspace.versionControl !== "git") return null;
  const choices = workspace.shellProjectId ? workspaces.filter((entry) => entry.shellProjectId === workspace.shellProjectId
    && entry.workspace.environmentId === workspace.workspace.environmentId && entry.workspace.versionControl === "git") : [workspace];
  const label = workspace.workspace.branch || "Detached HEAD";
  if (choices.length < 2 || disabled) return <span className="inline-flex min-w-0 items-center gap-1.5 px-2 text-xs text-muted-foreground"><GitBranch className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{label}</span></span>;
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button size="sm" variant="ghost" className="max-w-full gap-2 px-2 font-normal" aria-label="Choose thread checkout">
    <GitBranch className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate text-xs">{label}</span><ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
  </Button></PopoverTrigger><PopoverContent side="top" aria-label="Choose thread checkout" className="w-[min(22rem,calc(100vw-1.5rem))] bg-popover p-2">
    <h2 className="px-3 pb-2 pt-1 text-xs font-medium text-muted-foreground">Registered checkouts</h2><div className="max-h-64 space-y-1 overflow-y-auto">{choices.map((entry) => <button key={entry.id} type="button" aria-pressed={entry.id === workspace.id}
      onClick={() => { onSelect(entry.id); setOpen(false); }} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${entry.id === workspace.id ? "bg-secondary" : "hover:bg-muted"}`}>
      <GitBranch className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{entry.workspace.branch || "Detached HEAD"}</span>{entry.id === workspace.id && <Check className="size-4" aria-hidden="true" />}
    </button>)}</div>
  </PopoverContent></Popover>;
}
