import type { ToolImagePreview } from "@shared/types/conversation/queries.types";
import type { ThreadOutput, ThreadOutputKind } from "./threadOutputs.types";
import type { OutputHost } from "./toolImage.types";

/** How the Library sections its outputs. */
export type LibraryGrouping = "date" | "thread" | "type";
/** One output in the workspace Library, with the thread and checkout it came from. */
export type LibraryEntry = ThreadOutput & { conversationId: string; threadTitle: string; rootPath: string; archived: boolean };
export interface LibraryFilter {
  query: string;
  kind: ThreadOutputKind | "all";
  /** Only outputs from this thread; null for every thread. */
  conversationId: string | null;
}
export interface LibrarySection { key: string; label: string; entries: LibraryEntry[]; }
export interface LibraryThreadOption { conversationId: string; title: string; count: number; }
export type LibraryLoadState =
  | { status: "loading" }
  | { status: "ready"; entries: LibraryEntry[] }
  | { status: "unavailable"; message: string };
/** Thumbnail loads shared across the Library's tiles, keyed by entry. */
export interface ThumbnailCache { get(key: string): Promise<ToolImagePreview | null>; }
export interface LibraryToolProps { projectId: string; active: boolean; }
export interface LibraryToolbarProps {
  filter: LibraryFilter;
  grouping: LibraryGrouping;
  threads: readonly LibraryThreadOption[];
  counts: Partial<Record<ThreadOutputKind, number>>;
  loading: boolean;
  onFilterChange(patch: Partial<LibraryFilter>): void;
  onGroupingChange(grouping: LibraryGrouping): void;
  onRefresh(): void;
}
export interface LibraryGridProps {
  sections: readonly LibrarySection[];
  grouping: LibraryGrouping;
  selectedKey: string | null;
  thumbnails: ThumbnailCache;
  onOpen(entry: LibraryEntry): void;
}
export interface LibraryTileProps { entry: LibraryEntry; grouping: LibraryGrouping; selected: boolean; thumbnails: ThumbnailCache; onOpen(entry: LibraryEntry): void; }
/** What the viewer overlay shows for the current entry. */
export type LibraryViewerState =
  | { status: "loading" }
  | { status: "viewer"; path: string }
  | { status: "unsupported" }
  | { status: "unavailable"; message: string };
export interface LibraryViewerOverlayProps {
  entry: LibraryEntry;
  state: LibraryViewerState;
  position: { index: number; total: number };
  host: OutputHost;
  onPrevious(): void;
  onNext(): void;
  onClose(): void;
}
