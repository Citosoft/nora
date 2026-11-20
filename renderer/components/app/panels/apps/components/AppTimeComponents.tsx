import { useMemo, useState } from "react";
import type { ComponentFn } from "@json-render/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppCatalog } from "@shared/apps/catalog";
import { appValueFormatSchema } from "@shared/apps/catalog";
import type { AppValueFormat } from "@shared/types/apps/apps.types";
import { sameRow, useAppRowClick } from "@/components/app/hooks/useAppRowClick";
import { calendarMonth, timelineGroups } from "@/components/app/logic/apps/calendar";
import { appRows, cellValue, formatAppValue } from "@/components/app/logic/apps/formatValue";
import { propChoice, propText } from "@/components/app/logic/apps/propText";
import type { AppRow } from "@/components/app/types/apps.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHOWN_PER_DAY = 3;
const FORMATS = appValueFormatSchema.options;
const asFormat = (value: unknown): AppValueFormat | undefined => FORMATS.includes(value as AppValueFormat) ? value as AppValueFormat : undefined;

/** A month of days with the rows that fall on each; the month starts on the one holding today, or the first row's. */
export const AppCalendar: ComponentFn<AppCatalog, "Calendar"> = ({ props }) => {
  const rows = appRows(props.rows);
  const dateKey = propText(props.dateKey), title = propText(props.title), subtitle = propText(props.subtitle);
  const { onRow, selected } = useAppRowClick(props.rowAction, props.selectPath);
  const [cursor, setCursor] = useState(() => { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() }; });
  const month = useMemo(() => calendarMonth(cursor.year, cursor.month, rows, dateKey), [cursor, rows, dateKey]);
  const move = (delta: number): void => setCursor(({ year, month: current }) => { const next = new Date(year, current + delta, 1); return { year: next.getFullYear(), month: next.getMonth() }; });
  const entry = (row: AppRow, index: number) => {
    const label = formatAppValue(cellValue(row, title));
    const content = <><span className="block truncate">{label}</span>{subtitle && <span className="block truncate text-[10px] text-muted-foreground">{formatAppValue(cellValue(row, subtitle))}</span>}</>;
    const className = cn("w-full rounded px-1 py-0.5 text-left text-[11px] leading-tight", onRow ? "bg-primary/10 hover:bg-primary/20" : "bg-muted/60", sameRow(selected, row) && "ring-1 ring-primary");
    return onRow ? <button key={index} type="button" title={label} className={className} onClick={() => onRow(row)}>{content}</button> : <div key={index} title={label} className={className}>{content}</div>;
  };
  return <div className="flex min-w-0 flex-col gap-2">
    <div className="flex items-center justify-between">
      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
      <span className="text-sm font-medium">{month.label}</span>
      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Next month" onClick={() => move(1)}><ChevronRight className="size-4" aria-hidden="true" /></Button>
    </div>
    {!rows.length && <p className="text-xs text-muted-foreground">{propText(props.emptyText) || "Nothing scheduled."}</p>}
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border/60 bg-border/60 text-xs">
      {WEEKDAYS.map((day) => <div key={day} className="bg-card px-1.5 py-1 text-center text-[11px] font-medium text-muted-foreground">{day}</div>)}
      {month.weeks.flat().map((day) => <div key={day.key} className={cn("flex min-h-[4.5rem] flex-col gap-0.5 bg-card p-1", !day.inMonth && "bg-muted/30 text-muted-foreground")}>
        <span className={cn("mb-0.5 self-end rounded-full px-1 text-[11px] tabular-nums", day.today && "bg-primary text-primary-foreground")}>{day.day}</span>
        {day.rows.slice(0, SHOWN_PER_DAY).map(entry)}
        {day.rows.length > SHOWN_PER_DAY && <span className="px-1 text-[10px] text-muted-foreground">+{day.rows.length - SHOWN_PER_DAY} more</span>}
      </div>)}
    </div>
  </div>;
};

/** Rows down a line in date order, grouped by day. */
export const AppTimeline: ComponentFn<AppCatalog, "Timeline"> = ({ props }) => {
  const rows = appRows(props.rows);
  const dateKey = propText(props.dateKey), title = propText(props.title), subtitle = propText(props.subtitle), meta = propText(props.meta);
  const order = propChoice(props.order, ["newest", "oldest"], "newest");
  const { onRow, selected } = useAppRowClick(props.rowAction, props.selectPath);
  const groups = useMemo(() => timelineGroups(rows, dateKey, order), [rows, dateKey, order]);
  if (!groups.length) return <p className="text-xs text-muted-foreground">{propText(props.emptyText) || "Nothing yet."}</p>;
  return <ol className="relative ml-2 border-l border-border/70 pl-4">{groups.map((group) => <li key={group.key} className="mb-4 last:mb-0">
    <p className="relative mb-1.5 text-xs font-medium text-muted-foreground"><span className="absolute -left-[1.4rem] top-1 size-2 rounded-full border-2 border-card bg-primary" aria-hidden="true" />{group.label}</p>
    <ul className="space-y-1.5">{group.rows.map((row, index) => {
      const content = <>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{formatAppValue(cellValue(row, title))}</span>
          {subtitle && <span className="block truncate text-xs text-muted-foreground">{formatAppValue(cellValue(row, subtitle))}</span>}</span>
        {meta && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatAppValue(cellValue(row, meta), asFormat(props.metaFormat))}</span>}
      </>;
      const className = cn("flex w-full items-start gap-3 rounded-md border border-border/60 bg-card px-3 py-2 text-left", onRow && "hover:border-border hover:bg-muted/30", sameRow(selected, row) && "border-primary/50 bg-primary/10");
      return <li key={index}>{onRow ? <button type="button" className={className} onClick={() => onRow(row)}>{content}</button> : <div className={className}>{content}</div>}</li>;
    })}</ul>
  </li>)}</ol>;
};
