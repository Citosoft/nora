import { isAppImportRowChecked } from "@/components/app/logic/app-import/appImportChecklist";
import { AppImportRowView } from "@/components/app/panels/app-import/AppImportRowView";
import type { AppImportRowGroupViewProps } from "@/components/app/types/appImport.types";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

export function AppImportRowGroupView({ group, selected, disabled, onToggleRow, onSetGroup }: AppImportRowGroupViewProps) {
  const [open, setOpen] = useState(group.kind !== "keybinding" && group.rows.length <= 12);
  const listId = useId();
  const selectable = group.rows.filter((row) => row.keys.length > 0);
  const ticked = selectable.filter((row) => isAppImportRowChecked(row, selected)).length;
  return (
    <section className="rounded-lg border border-border/70">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((value) => !value)}>
          <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden />
          <span>{group.title}</span>
          <span className="text-xs font-normal text-muted-foreground">{ticked} of {group.rows.length} selected</span>
        </button>
        {selectable.length ? (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onSetGroup(group, ticked === 0)}>
            {ticked === 0 ? "Select all" : "Clear"}
          </Button>
        ) : null}
      </div>
      {open ? (
        <div id={listId} className="space-y-0.5 border-t border-border/60 p-1">
          {group.rows.map((row) => <AppImportRowView key={row.id} row={row} checked={isAppImportRowChecked(row, selected)} disabled={disabled} onToggle={onToggleRow} />)}
        </div>
      ) : null}
    </section>
  );
}
