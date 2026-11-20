import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Plus, Search } from "lucide-react";
import { CONNECTOR_GALLERY, CONNECTOR_GALLERY_CATEGORIES } from "@shared/connectors/gallery";
import { galleryTableRows, queryGalleryTable } from "@/components/app/logic/connectorGalleryTable";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import type { ConnectorGalleryGridProps, GallerySortKey, GalleryTableQuery } from "@/components/app/types/noraConnectors.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const COLUMNS: readonly { key: GallerySortKey; label: string; className?: string }[] = [
  { key: "name", label: "Service" }, { key: "category", label: "Category", className: "w-32" },
  { key: "signIn", label: "Sign-in", className: "w-36" }, { key: "status", label: "", className: "w-24 text-right" }
];

/** Official hosted MCP servers for work tools as a table to search, filter by category and sort; any other server can be typed in. */
export function ConnectorGalleryGrid({ addedUrls, onPick, onCustom }: ConnectorGalleryGridProps) {
  const [query, setQuery] = useState<GalleryTableQuery>({ search: "", category: "all", sort: "name", direction: "asc" });
  const rows = useMemo(() => galleryTableRows(CONNECTOR_GALLERY, addedUrls), [addedUrls]);
  const shown = useMemo(() => queryGalleryTable(rows, query), [rows, query]);
  const sortBy = (sort: GallerySortKey): void => setQuery((current) => ({ ...current, sort, direction: current.sort === sort && current.direction === "asc" ? "desc" : "asc" }));
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input autoFocus aria-label="Search connectors" placeholder="Search by name or what it does" value={query.search}
          onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value }))} className="h-9 pl-8 text-sm" />
      </div>
      <Select aria-label="Category" className="h-9 w-40 text-sm" value={query.category}
        onChange={(event) => setQuery((current) => ({ ...current, category: event.target.value as GalleryTableQuery["category"] }))}>
        <option value="all">All categories</option>
        {CONNECTOR_GALLERY_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
      </Select>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={onCustom}><Plus className="size-3.5" aria-hidden="true" />Custom MCP server</Button>
    </div>
    <div className="overflow-hidden rounded-lg border border-border/70">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>{COLUMNS.map((column) => {
          const active = query.sort === column.key;
          const Icon = !active ? ArrowUpDown : query.direction === "asc" ? ArrowUp : ArrowDown;
          return <th key={column.key} scope="col" aria-sort={active ? (query.direction === "asc" ? "ascending" : "descending") : "none"} className={cn("px-3 py-2 text-left font-medium", column.className)}>
            <button type="button" onClick={() => sortBy(column.key)} className={cn("inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active && "text-foreground")}>
              {column.label || "Status"}<Icon className={cn("size-3", !active && "opacity-50")} aria-hidden="true" /></button>
          </th>;
        })}</tr></thead>
        <tbody>{shown.map((row) => <tr key={row.entry.id} className="border-t border-border/60">
          <td className="px-3 py-2"><div className="flex min-w-0 items-center gap-2.5"><McpServerLogo logo={row.entry.logo} size="small" />
            <div className="min-w-0"><p className="truncate font-medium">{row.entry.name}</p><p className="truncate text-xs text-muted-foreground" title={row.entry.summary}>{row.entry.summary}</p></div></div></td>
          <td className="px-3 py-2 text-xs text-muted-foreground">{row.category}</td>
          <td className="px-3 py-2 text-xs text-muted-foreground" title={row.ownApp ? row.entry.setup?.note : undefined}>{row.ownApp ? "Your own OAuth app" : "Sign in directly"}</td>
          <td className="px-3 py-2 text-right">{row.added
            ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><Check className="size-3.5" aria-hidden="true" />Added</span>
            : <Button type="button" variant="outline" size="sm" className="h-7 px-2.5 text-xs" aria-label={`Add ${row.entry.name}`} onClick={() => onPick(row.entry)}>Add</Button>}</td>
        </tr>)}</tbody>
      </table>
      {!shown.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No connectors match. Try another search, or add it with Custom MCP server.</p>}
    </div>
  </div>;
}
