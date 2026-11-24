import { useState, type DragEvent } from "react";
import type { ComponentFn } from "@json-render/react";
import { useStateStore } from "@json-render/react";
import type { AppCatalog } from "@shared/apps/catalog";
import { appValueFormatSchema } from "@shared/apps/catalog";
import type { AppValueFormat } from "@shared/types/apps/apps.types";
import { useAppRuntimeContext } from "@/components/app/context/appRuntimeContext";
import { appRows, cellValue, formatAppValue } from "@/components/app/logic/apps/formatValue";
import { propText } from "@/components/app/logic/apps/propText";
import type { AppRow } from "@/components/app/types/apps.types";
import { cn } from "@/lib/utils";

const DRAG_TYPE = "application/x-nora-app-row";
const FORMATS = appValueFormatSchema.options;
const asFormat = (value: unknown): AppValueFormat | undefined => FORMATS.includes(value as AppValueFormat) ? value as AppValueFormat : undefined;

/**
 * Cards in columns by one field's value. With `moveAction`, a card dragged to another column (or moved with its menu) runs the action
 * with the row and that field already changed, so the connector gets the new value and the source reloads with it.
 */
export const AppKanban: ComponentFn<AppCatalog, "Kanban"> = ({ props }) => {
  const runtime = useAppRuntimeContext();
  const { get, set } = useStateStore();
  const rows = appRows(props.rows);
  const groupBy = propText(props.groupBy), title = propText(props.title), subtitle = propText(props.subtitle), meta = propText(props.meta);
  const moveAction = propText(props.moveAction), selectPath = propText(props.selectPath);
  const columns = Array.isArray(props.columns) ? props.columns.flatMap((entry) => entry && typeof entry === "object" && typeof entry.value === "string" ? [{ value: entry.value, label: propText(entry.label) || entry.value }] : []) : [];
  const [over, setOver] = useState<string | null>(null);
  const selected = selectPath ? get(selectPath) : undefined;
  const selectedId = selected && typeof selected === "object" && !Array.isArray(selected) ? (selected as AppRow).id : undefined;
  const move = (row: AppRow, value: string): void => { if (moveAction && String(row[groupBy] ?? "") !== value) runtime.runAction(moveAction, { ...row, [groupBy]: value }); };
  const onDrop = (event: DragEvent, value: string): void => {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
    event.preventDefault(); setOver(null);
    const index = Number(event.dataTransfer.getData(DRAG_TYPE));
    const row = rows[index];
    if (row) move(row, value);
  };
  if (!rows.length) return <p className="text-xs text-muted-foreground">{propText(props.emptyText) || "Nothing here."}</p>;
  return <div className="thin-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
    {columns.map((column) => {
      const cards = rows.map((row, index) => ({ row, index })).filter(({ row }) => String(row[groupBy] ?? "") === column.value);
      return <section key={column.value} aria-label={column.label} onDragOver={moveAction ? (event) => { if (event.dataTransfer.types.includes(DRAG_TYPE)) { event.preventDefault(); setOver(column.value); } } : undefined}
        onDragLeave={() => setOver((current) => current === column.value ? null : current)} onDrop={moveAction ? (event) => onDrop(event, column.value) : undefined}
        className={cn("flex w-56 shrink-0 flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 transition", over === column.value && "border-primary/50 bg-primary/5")}>
        <header className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground"><span>{column.label}</span><span>{cards.length}</span></header>
        {cards.map(({ row, index }) => <article key={row.id !== undefined ? String(row.id) : index} draggable={!!moveAction}
          onDragStart={(event) => { event.dataTransfer.setData(DRAG_TYPE, String(index)); event.dataTransfer.effectAllowed = "move"; }}
          onClick={selectPath ? () => set(selectPath, row) : undefined}
          className={cn("rounded-md border border-border/70 bg-card p-2.5 text-sm shadow-sm", moveAction && "cursor-grab active:cursor-grabbing", selectPath && "cursor-pointer hover:border-border",
            selectedId !== undefined && selectedId === row.id && "border-primary/50 bg-primary/10")}>
          <p className="truncate font-medium">{formatAppValue(cellValue(row, title))}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{formatAppValue(cellValue(row, subtitle))}</p>}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {meta ? <span className="truncate text-xs tabular-nums text-muted-foreground">{formatAppValue(cellValue(row, meta), asFormat(props.metaFormat))}</span> : <span />}
            {moveAction && columns.length > 1 && <select aria-label={`Move ${formatAppValue(cellValue(row, title))} to`} value={column.value} onClick={(event) => event.stopPropagation()}
              onChange={(event) => move(row, event.target.value)} className="h-6 max-w-[7rem] rounded border border-border/60 bg-background px-1 text-[10px] text-muted-foreground">
              {columns.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
          </div>
        </article>)}
      </section>;
    })}
  </div>;
};
