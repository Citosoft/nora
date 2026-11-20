import { useMemo, useRef, useState } from "react";
import { LibraryBig, LoaderCircle } from "lucide-react";
import { useWorkspaceSessionPanelActions, useWorkspaceSessionPanelData } from "@/components/app/context/workspaceSessionPanelContext";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useWorkspaceLibrary } from "@/components/app/hooks/useWorkspaceLibrary";
import { useWorkspaceView } from "@/components/app/hooks/useWorkspaceView";
import { filterLibraryEntries, flattenLibrarySections, groupLibraryEntries, libraryEntryKey, libraryKindCounts, libraryThreadOptions } from "@/components/app/logic/library/libraryEntries";
import { createThumbnailCache } from "@/components/app/logic/library/thumbnailCache";
import { createOutputHost, openOutput } from "@/components/app/logic/thread-workspace/openOutput";
import type { LibraryEntry, LibraryFilter, LibraryToolProps, LibraryViewerState } from "@/components/app/types/library.types";
import { LibraryGrid } from "./LibraryGrid";
import { LibraryToolbar } from "./LibraryToolbar";
import { LibraryViewerOverlay } from "./LibraryViewerOverlay";

const NO_FILTER: LibraryFilter = { query: "", kind: "all", conversationId: null };

/** Every non-code output across the workspace's threads as grouped thumbnails; selecting one views it over the grid. */
export function LibraryTool({ projectId, active }: LibraryToolProps) {
  const client = useNativeRuntimePorts().store.client;
  const actions = useWorkspaceSessionPanelActions();
  const { fileEditorState } = useWorkspaceSessionPanelData();
  const { view, updateView } = useWorkspaceView(projectId);
  const { state, loading, refresh } = useWorkspaceLibrary(projectId, active);
  const [filter, setFilter] = useState<LibraryFilter>(NO_FILTER);
  const [current, setCurrent] = useState<LibraryEntry | null>(null);
  const [viewer, setViewer] = useState<LibraryViewerState>({ status: "loading" });
  // Viewer tabs the Library opened itself; closing the overlay closes them so the session's editor stays as it was.
  const openedTabs = useRef(new Set<string>());
  const request = useRef(0);
  const entries = state.status === "ready" ? state.entries : [];
  const grouping = view.libraryGrouping;
  const sections = useMemo(() => groupLibraryEntries(filterLibraryEntries(entries, filter), grouping, new Date()), [entries, filter, grouping]);
  const visible = useMemo(() => flattenLibrarySections(sections), [sections]);
  const threads = useMemo(() => libraryThreadOptions(entries), [entries]);
  const counts = useMemo(() => libraryKindCounts(filter.conversationId ? entries.filter((entry) => entry.conversationId === filter.conversationId) : entries), [entries, filter.conversationId]);
  const thumbnails = useMemo(() => {
    const byKey = new Map(entries.map((entry) => [libraryEntryKey(entry), entry]));
    return createThumbnailCache(async (key) => {
      const entry = byKey.get(key);
      const file = entry ? await client.outputFile(entry.conversationId, entry.itemId, entry.path, "thumbnail") : null;
      return file?.kind === "image" ? file.preview : null;
    });
  }, [client, entries]);
  const currentKey = current ? libraryEntryKey(current) : null;
  const index = currentKey ? visible.findIndex((entry) => libraryEntryKey(entry) === currentKey) : -1;
  const open = (entry: LibraryEntry): void => {
    const attempt = ++request.current;
    setCurrent(entry);
    setViewer({ status: "loading" });
    const existing = new Set((fileEditorState?.tabs ?? []).map((tab) => tab.path));
    openOutput({ rootPath: entry.rootPath, host: createOutputHost(client, entry.conversationId), openFileEditor: actions.onOpenFileEditor, unsupported: "report" }, entry)
      .then((result) => {
        if (result.opened === "viewer" && !existing.has(result.path)) openedTabs.current.add(result.path);
        if (attempt !== request.current) return;
        setViewer(result.opened === "viewer" ? { status: "viewer", path: result.path } : { status: "unsupported" });
      }, (reason: unknown) => {
        if (attempt === request.current) setViewer({ status: "unavailable", message: reason instanceof Error ? reason.message : `${entry.name} could not be opened.` });
      });
  };
  const close = (): void => {
    request.current++;
    setCurrent(null);
    for (const path of openedTabs.current) actions.onCloseFileEditorTab(path);
    openedTabs.current.clear();
  };
  const step = (offset: number): void => { const next = visible[index + offset]; if (next) open(next); };
  const filtered = !!(filter.query.trim() || filter.kind !== "all" || filter.conversationId);
  return <div className="flex h-full min-h-0 flex-col">
    <LibraryToolbar filter={filter} grouping={grouping} threads={threads} counts={counts} loading={loading}
      onFilterChange={(patch) => setFilter((value) => ({ ...value, ...patch }))}
      onGroupingChange={(libraryGrouping) => updateView({ libraryGrouping })} onRefresh={refresh} />
    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8" aria-live="polite" aria-busy={loading}>
      {state.status === "loading" ? <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />Loading outputs…</p>
        : state.status === "unavailable" ? <p className="py-6 text-sm text-muted-foreground">{state.message}</p>
        : sections.length ? <LibraryGrid sections={sections} grouping={grouping} selectedKey={currentKey} thumbnails={thumbnails} onOpen={open} />
        : <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted"><LibraryBig className="size-7 text-muted-foreground" aria-hidden="true" /></span>
          <p className="max-w-sm text-sm text-muted-foreground">{filtered ? "No outputs match these filters." : "Images and files agents make in this workspace, other than code, collect here."}</p>
        </div>}
    </div>
    {current && <LibraryViewerOverlay entry={current} state={viewer} position={{ index, total: visible.length }}
      host={createOutputHost(client, current.conversationId)} onPrevious={() => step(-1)} onNext={() => step(1)} onClose={close} />}
  </div>;
}
