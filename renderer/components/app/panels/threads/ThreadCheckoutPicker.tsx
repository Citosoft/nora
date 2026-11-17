import { useState, type FormEvent } from "react";
import { Check, ChevronDown, GitBranch, LoaderCircle, Plus } from "lucide-react";
import { workspaceCheckouts } from "@/components/app/logic/thread-workspace/checkouts";
import { getPathLeafName } from "@/components/app/logic/pathLeaf";
import type { ThreadCheckoutPickerProps } from "@/components/app/types/thread-workspace/ports.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Chooses which checkout of the workspace (its checked-out branch or a worktree) a new thread runs in. */
export function ThreadCheckoutPicker({ workspace, selectedCheckoutId, disabled, onSelect, onCreateWorktree }: ThreadCheckoutPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (workspace.workspace.versionControl !== "git") return null;
  const checkouts = workspaceCheckouts(workspace);
  const selected = checkouts.find((entry) => entry.checkoutId === selectedCheckoutId) ?? workspace.workspace;
  const label = selected.branch || "Detached HEAD";
  const inWorktree = selected.checkoutId !== workspace.workspace.checkoutId;
  const triggerContent = <>
    <GitBranch className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span className="truncate text-xs">{label}</span>
    {inWorktree && <span className="shrink-0 rounded bg-muted px-1 text-[10px] uppercase tracking-wide text-muted-foreground">Worktree</span>}
  </>;
  if (disabled || (checkouts.length < 2 && !onCreateWorktree)) {
    return <span className="inline-flex min-w-0 items-center gap-1.5 px-2" title={selected.path}>{triggerContent}</span>;
  }
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) { setCreating(false); setBranch(""); setError(null); }
  };
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!onCreateWorktree || busy) return;
    setBusy(true); setError(null);
    try { await onCreateWorktree(branch); close(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The worktree could not be created."); }
    finally { setBusy(false); }
  };
  return <Popover open={open} onOpenChange={close}>
    <PopoverTrigger asChild>
      <Button size="sm" variant="ghost" className="max-w-full gap-2 px-2 font-normal" aria-label={`Thread checkout: ${label}`} title={selected.path}>
        {triggerContent}<ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent side="top" align="start" aria-label="Choose where this thread runs" className="w-[min(22rem,calc(100vw-1.5rem))] p-2">
      <h2 className="px-2 pb-2 pt-1 text-xs font-medium text-muted-foreground">Run this thread in</h2>
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {checkouts.map((entry, index) => {
          const isSelected = entry.checkoutId === selected.checkoutId;
          return <button key={entry.checkoutId} type="button" aria-pressed={isSelected} title={entry.path}
            onClick={() => { onSelect(index === 0 ? null : entry.checkoutId); close(false); }}
            className={`flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "bg-secondary" : "hover:bg-muted"}`}>
            <GitBranch className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{entry.branch || "Detached HEAD"}</span>
              <span className="block truncate text-xs text-muted-foreground">{index === 0 ? "Checked-out branch" : `Worktree · ${getPathLeafName(entry.path)}`}</span>
            </span>
            {isSelected && <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          </button>;
        })}
      </div>
      {onCreateWorktree && <div className="mt-1 border-t border-border/60 pt-1">
        {creating ? <form className="space-y-2 px-2 py-2" onSubmit={(event) => void create(event)}>
          <label className="block space-y-1.5 text-xs">
            <span className="font-medium">New worktree branch</span>
            <Input autoFocus value={branch} onChange={(event) => { setBranch(event.target.value); setError(null); }} placeholder="feature/my-change"
              maxLength={200} disabled={busy} autoComplete="off" spellCheck={false} className="h-8 text-xs" />
          </label>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => { setCreating(false); setError(null); }}>Cancel</Button>
            <Button type="submit" size="sm" className="h-7 px-3 text-xs" disabled={!branch.trim() || busy}>
              {busy && <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />}{busy ? "Creating…" : "Create and use"}
            </Button>
          </div>
        </form> : <button type="button" onClick={() => setCreating(true)}
          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Plus className="size-4 shrink-0" aria-hidden="true" />New worktree…
        </button>}
      </div>}
    </PopoverContent>
  </Popover>;
}
