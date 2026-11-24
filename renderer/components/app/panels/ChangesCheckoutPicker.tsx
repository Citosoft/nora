import { useState } from "react";
import { Check, ChevronDown, GitBranch } from "lucide-react";
import { getPathLeafName } from "@/components/app/logic/pathLeaf";
import type { ChangesCheckoutOption, ChangesCheckoutPickerProps } from "@/components/app/types/changesCheckout.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function optionTitle(option: ChangesCheckoutOption): string {
  return option.branch || (option.kind === "project" ? "Project checkout" : getPathLeafName(option.path));
}

function optionDetail(option: ChangesCheckoutOption): string {
  const place = option.kind === "project" ? "Checked-out branch" : `Worktree · ${getPathLeafName(option.path)}`;
  if (!option.threads.length) return place;
  return `${place} · ${option.threads.length} thread${option.threads.length === 1 ? "" : "s"}`;
}

/** Chooses which checkout the Changes panel shows, independent of the focused thread. */
export function ChangesCheckoutPicker({ options, selectedPath, disabled, onSelect }: ChangesCheckoutPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.path === selectedPath) ?? null;
  const label = selected ? optionTitle(selected) : getPathLeafName(selectedPath) || "No repository selected";
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="ghost" size="sm" disabled={disabled || options.length === 0}
        className="h-6 min-w-0 max-w-full justify-start gap-2 px-1 text-xs font-normal text-muted-foreground"
        aria-label={`Changes checkout: ${label}`} title={selectedPath}>
        <GitBranch className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
        {selected?.kind === "worktree" && <span className="shrink-0 rounded bg-muted px-1 text-[9px] uppercase tracking-wide">Worktree</span>}
        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" aria-label="Choose checkout to review" className="w-[min(24rem,calc(100vw-1.5rem))] p-2">
      <h2 className="px-2 pb-2 pt-1 text-xs font-medium text-muted-foreground">Show changes from</h2>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {options.map((option) => {
          const isSelected = option.path === selectedPath;
          return <button key={option.path} type="button" aria-pressed={isSelected} title={option.path}
            onClick={() => { setOpen(false); if (!isSelected) onSelect(option.path); }}
            className={`flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "bg-secondary" : "hover:bg-muted"}`}>
            <GitBranch className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{optionTitle(option)}</span>
              <span className="block truncate text-xs text-muted-foreground">{optionDetail(option)}</span>
              {option.threads.length > 0 && <span className="block truncate text-xs text-muted-foreground/80">
                {option.threads.map((thread) => thread.title).join(", ")}
              </span>}
            </span>
            {isSelected && <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          </button>;
        })}
      </div>
    </PopoverContent>
  </Popover>;
}
