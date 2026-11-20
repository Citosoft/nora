import { CONNECTOR_GALLERY_CATEGORIES } from "@shared/connectors/gallery";
import type { ConnectorGalleryEntry } from "@shared/types/connectors/gallery.types";
import type { GalleryTableQuery, GalleryTableRow, GallerySortKey } from "@/components/app/types/noraConnectors.types";

const normaliseUrl = (url: string): string => url.replace(/\/+$/, "").toLowerCase();
const categoryLabel = (id: ConnectorGalleryEntry["category"]): string => CONNECTOR_GALLERY_CATEGORIES.find((category) => category.id === id)?.label ?? id;
const categoryOrder = (id: ConnectorGalleryEntry["category"]): number => CONNECTOR_GALLERY_CATEGORIES.findIndex((category) => category.id === id);

/** Each gallery server with what the table shows: its category label, whether it needs the user's own sign-in app, and whether it is added. */
export function galleryTableRows(entries: readonly ConnectorGalleryEntry[], addedUrls: readonly string[]): GalleryTableRow[] {
  const added = new Set(addedUrls.map(normaliseUrl));
  return entries.map((entry) => ({ entry, category: categoryLabel(entry.category), ownApp: entry.registration === "client", added: added.has(normaliseUrl(entry.url)) }));
}

const compare: Record<GallerySortKey, (a: GalleryTableRow, b: GalleryTableRow) => number> = {
  name: (a, b) => a.entry.name.localeCompare(b.entry.name),
  // Categories sort in the gallery's own order (email first), which reads better than alphabetical.
  category: (a, b) => categoryOrder(a.entry.category) - categoryOrder(b.entry.category),
  signIn: (a, b) => Number(a.ownApp) - Number(b.ownApp),
  status: (a, b) => Number(a.added) - Number(b.added)
};

/** Rows matching the search (name, summary or category) and category filter, sorted by the chosen column; ties fall back to name. */
export function queryGalleryTable(rows: readonly GalleryTableRow[], query: GalleryTableQuery): GalleryTableRow[] {
  const needle = query.search.trim().toLowerCase();
  const direction = query.direction === "asc" ? 1 : -1;
  return rows
    .filter((row) => query.category === "all" || row.entry.category === query.category)
    .filter((row) => !needle || [row.entry.name, row.entry.summary, row.category].some((text) => text.toLowerCase().includes(needle)))
    .sort((a, b) => direction * compare[query.sort](a, b) || compare.name(a, b));
}
