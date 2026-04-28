import {
  browseWorkspaceQuickSearchRows,
  buildWorkspaceQuickSearchRows,
  filterWorkspaceQuickSearchRows
} from "@/components/app/logic/workspaceQuickSearchModel";
import type {
  TitleBarWorkspaceQuickSearchConfig,
  WorkspaceQuickSearchGroupId,
  WorkspaceQuickSearchRow
} from "@/components/app/types/titlebarWorkspaceSearch.types";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Bot,
  FileStack,
  FileText,
  ListTodo,
  Search,
  StickyNote,
  Terminal
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GROUP_LABELS: Record<WorkspaceQuickSearchGroupId, string> = {
  agents: "Agents",
  terminals: "Terminals",
  tasks: "Tasks",
  specs: "Specs",
  notes: "Notes",
  files: "Files"
};

const GROUP_ICONS: Record<WorkspaceQuickSearchGroupId, typeof Bot> = {
  agents: Bot,
  terminals: Terminal,
  tasks: ListTodo,
  specs: FileStack,
  notes: StickyNote,
  files: FileText
};

const GROUP_ORDER: WorkspaceQuickSearchGroupId[] = [
  "agents",
  "terminals",
  "tasks",
  "specs",
  "notes",
  "files"
];

type TitleBarWorkspaceQuickSearchProps = TitleBarWorkspaceQuickSearchConfig;

export const TitleBarWorkspaceQuickSearch = ({
  source,
  openRequestId,
  resolvedTheme,
  openShortcutLabel,
  onPick
}: TitleBarWorkspaceQuickSearchProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const lastOpenRequestRef = useRef(0);
  const highlightSyncRef = useRef<{ open: boolean; query: string; resultCount: number }>({
    open: false,
    query: "",
    resultCount: 0
  });

  const allRows = useMemo(() => buildWorkspaceQuickSearchRows(source), [source]);
  const displayRows = useMemo(() => {
    const trimmed = query.trim();
    return trimmed ? filterWorkspaceQuickSearchRows(allRows, trimmed) : browseWorkspaceQuickSearchRows(allRows);
  }, [allRows, query]);

  useEffect(() => {
    if (openRequestId === 0 || openRequestId === lastOpenRequestRef.current) {
      return;
    }

    lastOpenRequestRef.current = openRequestId;
    setOpen(true);
    setQuery("");
    setHighlightedIndex(0);
    queueMicrotask(() => {
      paletteInputRef.current?.focus();
      paletteInputRef.current?.select();
    });
  }, [openRequestId]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    paletteInputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      highlightSyncRef.current = { open: false, query: "", resultCount: 0 };
      return;
    }

    const prev = highlightSyncRef.current;
    const resultCount = displayRows.length;
    const queryChanged = prev.query !== query;
    const paletteOpened = !prev.open;
    const countChanged = prev.resultCount !== resultCount;

    highlightSyncRef.current = { open: true, query, resultCount };

    if (paletteOpened || queryChanged) {
      setHighlightedIndex(resultCount ? 0 : -1);
      return;
    }

    if (countChanged) {
      setHighlightedIndex((current) => {
        if (resultCount === 0) {
          return -1;
        }

        if (current >= resultCount) {
          return resultCount - 1;
        }

        return current;
      });
    }
  }, [open, query, displayRows.length]);

  useLayoutEffect(() => {
    if (!open || highlightedIndex < 0) {
      return;
    }

    const root = resultsScrollRef.current;
    if (!root) {
      return;
    }

    const option = root.querySelector<HTMLElement>(`[data-workspace-search-index="${highlightedIndex}"]`);
    option?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [highlightedIndex, open, displayRows.length]);

  const titleBarSelectorSurfaceClass =
    resolvedTheme === "light" ? "border-slate-300 bg-white" : "border-border/70 bg-background/70";

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if (!next) {
      setQuery("");
    }
  };

  const handleSelectRow = (row: WorkspaceQuickSearchRow): void => {
    onPick(row.pick);
    handleOpenChange(false);
  };

  const moveHighlight = (direction: 1 | -1): void => {
    if (!displayRows.length) {
      return;
    }

    setHighlightedIndex((current) => {
      if (direction === 1) {
        const base = current < 0 ? 0 : current;
        return (base + 1) % displayRows.length;
      }

      if (current <= 0) {
        return displayRows.length - 1;
      }

      return current - 1;
    });
  };

  const handlePaletteInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === "Enter") {
      if (highlightedIndex < 0 || highlightedIndex >= displayRows.length) {
        return;
      }

      event.preventDefault();
      handleSelectRow(displayRows[highlightedIndex]);
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex < 0 || highlightedIndex >= displayRows.length) {
        return;
      }

      handleSelectRow(displayRows[highlightedIndex]);
    }
  };

  const groupedSections = useMemo(() => {
    const map = new Map<WorkspaceQuickSearchGroupId, { row: WorkspaceQuickSearchRow; flatIndex: number }[]>();
    displayRows.forEach((row, flatIndex) => {
      const list = map.get(row.group) ?? [];
      list.push({ row, flatIndex });
      map.set(row.group, list);
    });

    return GROUP_ORDER.map((group) => ({
      group,
      entries: map.get(group) ?? []
    })).filter((section) => section.entries.length > 0);
  }, [displayRows]);

  const palette = open
    ? createPortal(
      (
        <div
          className="fixed inset-0 z-[20000] flex items-start justify-center bg-background/80 px-4 pb-10 pt-[min(12rem,15vh)] backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleOpenChange(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Workspace search"
            className={cn(
              "flex max-h-[min(560px,calc(100vh-6rem))] w-[min(640px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-2xl"
            )}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2.5">
              <Search
                className={cn(
                  "size-4 shrink-0",
                  resolvedTheme === "light" ? "text-slate-500" : "text-muted-foreground"
                )}
                aria-hidden
              />
              <Input
                ref={paletteInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handlePaletteInputKeyDown}
                placeholder="Search agents, terminals, tasks, specs, notes, files…"
                aria-label="Workspace search query"
                autoComplete="off"
                spellCheck={false}
                className="h-9 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <kbd className="hidden shrink-0 rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
                Esc
              </kbd>
            </div>
            <div
              role="listbox"
              aria-label="Workspace search results"
              className="min-h-0 flex-1"
              onKeyDown={handleListKeyDown}
              tabIndex={-1}
            >
              {!displayRows.length ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {query.trim() ? "No matches in this workspace." : "Nothing to show yet for this workspace."}
                </div>
              ) : (
                <ScrollArea ref={resultsScrollRef} className="max-h-[min(420px,calc(100vh-14rem))]">
                  <div className="space-y-2 p-2">
                    {groupedSections.map(({ group, entries }) => {
                      const Icon = GROUP_ICONS[group];
                      return (
                        <div key={group} className="space-y-1">
                          <div className="flex items-center gap-1.5 px-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                            {GROUP_LABELS[group]}
                          </div>
                          <div className="space-y-0.5">
                            {entries.map(({ row, flatIndex }) => {
                              const isActive = flatIndex === highlightedIndex;
                              return (
                                <button
                                  key={row.key}
                                  type="button"
                                  role="option"
                                  aria-selected={isActive}
                                  data-workspace-search-index={flatIndex}
                                  className={cn(
                                    "flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left text-sm transition",
                                    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                                  )}
                                  onMouseEnter={() => setHighlightedIndex(flatIndex)}
                                  onClick={() => handleSelectRow(row)}
                                >
                                  <span className="truncate font-medium">{row.title}</span>
                                  {row.subtitle ? (
                                    <span
                                      className={cn(
                                        "truncate text-xs",
                                        isActive ? "opacity-90" : "text-muted-foreground"
                                      )}
                                    >
                                      {row.subtitle}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
            <div className="shrink-0 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="hidden sm:inline">↑↓ to navigate · Enter to open · </span>
              Esc to close
            </div>
          </div>
        </div>
      ),
      document.body
    )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className={cn(
          "flex h-8 w-full min-w-[12rem] max-w-md items-center gap-2 rounded-[6px] border py-1 pl-2.5 pr-2 text-left text-xs transition hover:bg-accent/40",
          titleBarSelectorSurfaceClass
        )}
        aria-label="Open workspace search"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Search
          className={cn(
            "size-3.5 shrink-0",
            resolvedTheme === "light" ? "text-slate-500" : "text-muted-foreground"
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">Search workspace…</span>
        <kbd className="shrink-0 rounded border border-border/60 bg-muted/40 px-1 py-px font-mono text-[10px] text-muted-foreground">
          {openShortcutLabel}
        </kbd>
      </button>
      {palette}
    </>
  );
};
