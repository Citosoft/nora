import { useMemo } from "react";
import { parseDelimitedTable } from "@shared/text/delimited";
import type { DelimitedTableViewProps } from "@/components/app/types/delimitedText.types";
import { cn } from "@/lib/utils";

/** A CSV or TSV file as a scrollable table with sticky headings and row numbers. */
export function DelimitedTableView({ content, delimiter }: DelimitedTableViewProps) {
  const table = useMemo(() => parseDelimitedTable(content, delimiter), [content, delimiter]);
  if (!table.header.length) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">This file has no rows.</div>;
  const cell = "max-w-[28rem] truncate border-b border-r border-border/50 px-3 py-1.5";
  return <div className="flex h-full min-h-0 flex-col">
    <div className="thin-scrollbar min-h-0 flex-1 overflow-auto">
      <table className="min-w-full border-separate border-spacing-0 text-xs">
        <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
          <tr>
            <th scope="col" className="sticky left-0 z-20 border-b border-r border-border/60 bg-muted/95 px-2 py-2 text-right font-normal text-muted-foreground"><span className="sr-only">Row</span></th>
            {table.header.map((heading, column) => <th key={column} scope="col" title={heading}
              className={cn(cell, "py-2 text-left font-semibold text-foreground", table.numericColumns[column] && "text-right")}>{heading || <span className="text-muted-foreground">Column {column + 1}</span>}</th>)}
          </tr>
        </thead>
        <tbody>{table.rows.map((cells, row) => <tr key={row} className="odd:bg-transparent even:bg-muted/25 hover:bg-primary/5">
          <th scope="row" className="sticky left-0 border-b border-r border-border/50 bg-card px-2 py-1.5 text-right font-normal tabular-nums text-muted-foreground">{row + 1}</th>
          {cells.map((value, column) => <td key={column} title={value} className={cn(cell, table.numericColumns[column] && "text-right tabular-nums")}>{value}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="shrink-0 border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground">
      {table.truncated ? `Showing ${table.rows.length.toLocaleString()} of ${table.totalRows.toLocaleString()} rows${table.header.length >= 200 ? " and the first 200 columns" : ""}. Switch to Text to see everything.`
        : `${table.totalRows.toLocaleString()} ${table.totalRows === 1 ? "row" : "rows"} · ${table.header.length} ${table.header.length === 1 ? "column" : "columns"}`}
    </p>
  </div>;
}
