import { useMemo } from "react";
import type { ComponentFn } from "@json-render/react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AppCatalog } from "@shared/apps/catalog";
import { appValueFormatSchema } from "@shared/apps/catalog";
import type { AppValueFormat } from "@shared/types/apps/apps.types";
import { useAppRuntimeContext } from "@/components/app/context/appRuntimeContext";
import { sameRow, useAppRowClick } from "@/components/app/hooks/useAppRowClick";
import { useShownRows } from "@/components/app/hooks/useShownRows";
import type { ShownRows } from "@/components/app/types/appsComponents.types";
import { appRows, cellValue, formatAppValue, isNumericFormat } from "@/components/app/logic/apps/formatValue";
import { propChoice, propNumber, propText } from "@/components/app/logic/apps/propText";
import type { AppRow } from "@/components/app/types/apps.types";
import type { JsonValue } from "@main/jsonValue";
import { cn } from "@/lib/utils";
import { AppEditableCell } from "./AppEditableCell";

const FORMATS = appValueFormatSchema.options;
const SERIES_COLOURS = ["hsl(var(--primary))", "hsl(160 55% 42%)", "hsl(262 52% 52%)", "hsl(32 92% 48%)", "hsl(200 70% 48%)", "hsl(340 60% 50%)"];
const asFormat = (value: unknown): AppValueFormat | undefined => FORMATS.includes(value as AppValueFormat) ? value as AppValueFormat : undefined;
const toSeriesNumber = (value: unknown): number => typeof value === "number" ? value : typeof value === "string" ? Number(value) || 0 : 0;

interface ColumnSpec { key: string; label: string; format?: AppValueFormat; currency?: string; editable: boolean; }
const columnsOf = (value: unknown): ColumnSpec[] => Array.isArray(value) ? value.flatMap((entry) => entry && typeof entry === "object" && typeof entry.key === "string"
  ? [{ key: entry.key, label: typeof entry.label === "string" ? entry.label : entry.key, format: asFormat(entry.format), ...(typeof entry.currency === "string" ? { currency: entry.currency } : {}), editable: entry.editable === true }] : []) : [];
/** What an edited cell writes back: numbers stay numbers for numeric columns, and an emptied cell becomes null. */
const editedValue = (text: string, column: ColumnSpec): JsonValue => text === "" ? null : isNumericFormat(column.format) && Number.isFinite(Number(text)) ? Number(text) : text;

const pageSizeOf = (value: unknown): number | undefined => typeof value === "number" && value > 0 ? value : undefined;
const ShowMore = ({ shown }: { shown: ShownRows }) => shown.hidden > 0
  ? <button type="button" onClick={shown.showMore} className="mt-2 w-fit rounded border border-border/70 px-2 py-1 text-xs text-muted-foreground hover:bg-muted">Show {Math.min(shown.hidden, 1_000).toLocaleString()} more</button> : null;

export const AppTable: ComponentFn<AppCatalog, "Table"> = ({ props }) => {
  const runtime = useAppRuntimeContext();
  const allRows = appRows(props.rows);
  const shown = useShownRows(allRows, pageSizeOf(props.pageSize));
  const rows = shown.rows;
  const columns = columnsOf(props.columns);
  const { onRow, selected } = useAppRowClick(props.rowAction, props.selectPath);
  const editAction = propText(props.editAction);
  if (!rows.length) return <p className="text-xs text-muted-foreground">{propText(props.emptyText) || "Nothing to show."}</p>;
  const cell = "max-w-[20rem] truncate border-b border-border/50 px-3 py-2";
  return <div className="thin-scrollbar -mx-4 overflow-auto px-4">
    <table className="min-w-full border-separate border-spacing-0 text-xs">
      <thead className="sticky top-0 z-10 bg-card"><tr>{columns.map((column) => <th key={column.key} scope="col"
        className={cn(cell, "border-b-border/70 text-left font-medium text-muted-foreground", isNumericFormat(column.format) && "text-right")}>{column.label}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index} className={cn("hover:bg-muted/40", onRow && "cursor-pointer", sameRow(selected, row) && "bg-primary/10")} aria-selected={onRow ? sameRow(selected, row) : undefined}
        onClick={onRow ? () => onRow(row) : undefined} tabIndex={onRow ? 0 : undefined} onKeyDown={onRow ? (event) => { if (event.key === "Enter") onRow(row); } : undefined}>
        {columns.map((column, position) => { const text = formatAppValue(cellValue(row, column.key), column.format, column.currency);
          const editable = column.editable && !!editAction;
          return <td key={column.key} title={editable ? undefined : text} onClick={editable ? (event) => event.stopPropagation() : undefined}
            className={cn(cell, position === 0 && "font-medium text-foreground", position === 0 && onRow && "text-primary", isNumericFormat(column.format) && "text-right tabular-nums")}>
            {editable ? <AppEditableCell text={text} numeric={isNumericFormat(column.format)} onCommit={(value) => runtime.runAction(editAction, { ...row, [column.key]: editedValue(value, column) })} /> : text}</td>; })}
      </tr>)}</tbody>
    </table>
    <ShowMore shown={shown} />
  </div>;
};

export const AppList: ComponentFn<AppCatalog, "List"> = ({ props }) => {
  const allRows = appRows(props.rows);
  const shown = useShownRows(allRows, pageSizeOf(props.pageSize));
  const rows = shown.rows;
  const { onRow, selected } = useAppRowClick(props.rowAction, props.selectPath);
  const title = propText(props.title), subtitle = propText(props.subtitle), meta = propText(props.meta);
  if (!rows.length) return <p className="text-xs text-muted-foreground">{propText(props.emptyText) || "Nothing to show."}</p>;
  return <><ul className="-mx-4 divide-y divide-border/50">{rows.map((row, index) => {
    const content = <>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{formatAppValue(cellValue(row, title))}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{formatAppValue(cellValue(row, subtitle))}</span>}</span>
      {meta && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatAppValue(cellValue(row, meta), asFormat(props.metaFormat))}</span>}
    </>;
    return <li key={index}>{onRow
      ? <button type="button" aria-pressed={sameRow(selected, row)} className={cn("flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-muted/40", sameRow(selected, row) && "bg-primary/10")} onClick={() => onRow(row)}>{content}</button>
      : <div className="flex items-center gap-3 px-4 py-2">{content}</div>}</li>;
  })}</ul>{shown.hidden > 0 && <div className="px-0"><ShowMore shown={shown} /></div>}</>;
};

/** One object's fields as labelled values: the selected row, or a detail source's single result. */
export const AppRecord: ComponentFn<AppCatalog, "Record"> = ({ props }) => {
  const item = props.item && typeof props.item === "object" && !Array.isArray(props.item) && !("$state" in props.item) ? props.item as AppRow : null;
  const fields = columnsOf(props.fields);
  if (!item) return <p className="text-xs text-muted-foreground">{propText(props.emptyText) || "Nothing selected."}</p>;
  return <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">{fields.map((field) => {
    const text = formatAppValue(cellValue(item, field.key), field.format, field.currency);
    return <div key={field.key} className="contents"><dt className="text-xs font-medium text-muted-foreground">{field.label}</dt><dd className={cn("min-w-0 break-words", isNumericFormat(field.format) && "tabular-nums")}>{text || "—"}</dd></div>;
  })}</dl>;
};

export const AppMetric: ComponentFn<AppCatalog, "Metric"> = ({ props }) => {
  const value = formatAppValue(typeof props.value === "number" || typeof props.value === "string" ? props.value : null, asFormat(props.format), propText(props.currency) || undefined);
  return <div className="flex flex-col gap-1">
    <span className="text-xs text-muted-foreground">{propText(props.label)}</span>
    <span className="text-2xl font-semibold tabular-nums tracking-tight">{value || "—"}</span>
    {propText(props.hint) && <span className="text-xs text-muted-foreground">{propText(props.hint)}</span>}
  </div>;
};

export const AppChart: ComponentFn<AppCatalog, "Chart"> = ({ props }) => {
  const rows = appRows(props.rows);
  const xKey = propText(props.xKey);
  const format = asFormat(props.format) ?? "number";
  const currency = propText(props.currency) || undefined;
  const series = useMemo(() => Array.isArray(props.series) ? props.series.flatMap((entry) => entry && typeof entry === "object" && typeof entry.key === "string"
    ? [{ key: entry.key, label: typeof entry.label === "string" ? entry.label : entry.key }] : []) : [], [props.series]);
  const data = useMemo(() => rows.map((row) => ({ ...Object.fromEntries(series.map((entry) => [entry.key, toSeriesNumber(row[entry.key])])), [xKey]: formatAppValue(row[xKey]) })), [rows, series, xKey]);
  const height = propNumber(props.height, 260);
  const formatValue = (value: unknown) => formatAppValue(typeof value === "number" ? value : null, format, currency);
  // The value axis is as wide as its longest label, so currency ticks such as US$2,600.00 are never clipped.
  const axisWidth = Math.min(140, Math.max(48, 12 + 7 * Math.max(...series.map((entry) => formatValue(Math.max(...data.map((row) => Number(row[entry.key]) || 0))).length))));
  if (!rows.length || !series.length) return <p className="text-xs text-muted-foreground">Nothing to chart yet.</p>;
  const type = propChoice(props.type, ["bar", "line", "pie"], "bar");
  const [first] = series;
  return <div style={{ height }} className="text-xs">
    <ResponsiveContainer width="100%" height="100%">
      {type === "pie" && first ? <PieChart>
        <Pie data={data} dataKey={first.key} nameKey={xKey} innerRadius="45%" outerRadius="80%" paddingAngle={2}>
          {data.map((_entry, index) => <Cell key={index} fill={SERIES_COLOURS[index % SERIES_COLOURS.length]} />)}</Pie>
        <Tooltip formatter={formatValue} /><Legend />
      </PieChart> : type === "line" ? <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" /><YAxis tickFormatter={formatValue} stroke="hsl(var(--muted-foreground))" width={axisWidth} />
        <Tooltip formatter={formatValue} />{series.length > 1 && <Legend />}
        {series.map((entry, index) => <Line key={entry.key} type="monotone" dataKey={entry.key} name={entry.label} stroke={SERIES_COLOURS[index % SERIES_COLOURS.length]} dot={false} strokeWidth={2} />)}
      </LineChart> : <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" /><YAxis tickFormatter={formatValue} stroke="hsl(var(--muted-foreground))" width={axisWidth} />
        <Tooltip formatter={formatValue} />{series.length > 1 && <Legend />}
        {series.map((entry, index) => <Bar key={entry.key} dataKey={entry.key} name={entry.label} fill={SERIES_COLOURS[index % SERIES_COLOURS.length]} radius={[3, 3, 0, 0]} />)}
      </BarChart>}
    </ResponsiveContainer>
  </div>;
};
