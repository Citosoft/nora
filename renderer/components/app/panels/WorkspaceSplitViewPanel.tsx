import { useWorkspaceSessionContext } from "@/components/app/context/workspaceSessionContext";
import {
  dataTransferDeclaresWorkspaceSplitViewItem,
  readWorkspaceSplitViewItemFromDataTransfer
} from "@/components/app/logic/workspaceSplitViewDrag";
import {
  dataTransferDeclaresPathOrFileDrop,
  readWorkspaceRelativePathFromDataTransfer
} from "@/components/app/logic/workspacePathDrag";
import {
  useWorkspaceSessionPanelActions,
  useWorkspaceSessionPanelData
} from "@/components/app/context/workspaceSessionPanelContext";
import { BrowserTabPanel } from "@/components/app/panels/BrowserTabPanel";
import { FileEditorPanel } from "@/components/app/panels/FileEditorPanel";
import { FocusedAgentPanel } from "@/components/app/panels/FocusedAgentPanel";
import type { WorkspaceSplitViewPanelProps } from "@/components/app/types/component.types";
import type { BrowserTabState, FileEditorTab } from "@/components/app/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type {
  AgentSession,
  TerminalSession,
  WorkspaceSplitViewItemReference
} from "@shared/appTypes";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bot,
  Ellipsis,
  FileText,
  Focus,
  Globe,
  GripVertical,
  Plus,
  TerminalSquare,
  Trash2,
  Unplug
} from "lucide-react";
import { useMemo, useState } from "react";

type AvailableItemEntry = {
  key: string;
  label: string;
  description: string;
  item: WorkspaceSplitViewItemReference;
  icon: typeof Bot;
};

function getLeafName(pathName: string): string {
  const normalizedPath = pathName.replace(/\\/g, "/");
  const segments = normalizedPath.split("/");
  return segments[segments.length - 1] || pathName;
}

export function WorkspaceSplitViewPanel({ view }: WorkspaceSplitViewPanelProps) {
  const {
    workspace
  } = useWorkspaceSessionContext();
  const {
    browserTabs,
    fileEditorState,
    resolvedTheme,
    appSettings
  } = useWorkspaceSessionPanelData();
  const {
    onExitSplitView,
    onFocusAgent,
    onFocusTerminal,
    onFocusBrowserTab,
    onOpenFileEditor,
    onFocusFileEditorTab,
    onSetActiveWorkspaceContentTab,
    onChangeFileEditorTabContent,
    onSaveFileEditorTab,
    onRevertFileEditorTab,
    onAddItemToView,
    onAddItemToSlot,
    onMoveTile,
    onMoveTileToPosition,
    onSwapTiles,
    onRemoveTile
  } = useWorkspaceSessionPanelActions();
  const agents = workspace?.agents ?? [];
  const terminals = workspace?.terminals ?? [];
  const projectBrowserTabs = useMemo(
    () => browserTabs.filter((tab) => tab.projectId === workspace?.project.id),
    [browserTabs, workspace?.project.id]
  );
  const fileTabs = useMemo(
    () => fileEditorState?.tabs.filter((tab) => tab.projectId === workspace?.project.id) ?? [],
    [fileEditorState?.tabs, workspace?.project.id]
  );
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null);
  const [activeDropTargetId, setActiveDropTargetId] = useState<string | null>(null);
  const [isExternalDropActive, setIsExternalDropActive] = useState(false);
  const workspaceId = workspace?.project.id ?? null;
  const usedAgentIds = new Set(view.tiles.flatMap((tile) => tile.item.kind === "agent" ? [tile.item.agentId] : []));
  const usedTerminalIds = new Set(view.tiles.flatMap((tile) => tile.item.kind === "terminal" ? [tile.item.terminalId] : []));
  const usedBrowserTabIds = new Set(view.tiles.flatMap((tile) => tile.item.kind === "browser" ? [tile.item.tabId] : []));
  const usedFilePaths = new Set(view.tiles.flatMap((tile) => tile.item.kind === "file" ? [tile.item.path] : []));
  const availableItems: AvailableItemEntry[] = [
    ...agents
      .filter((agent) => !usedAgentIds.has(agent.id))
      .map((agent) => ({
        key: `agent:${agent.id}`,
        label: `${agent.name} (${agent.toolLabel})`,
        description: "Agent",
        item: {
          kind: "agent" as const,
          agentId: agent.id,
          sessionId: agent.sessionId
        },
        icon: Bot
      })),
    ...terminals
      .filter((terminal) => !usedTerminalIds.has(terminal.id))
      .map((terminal) => ({
        key: `terminal:${terminal.id}`,
        label: `${terminal.name} (${terminal.shellLabel})`,
        description: "Terminal",
        item: {
          kind: "terminal" as const,
          terminalId: terminal.id,
          sessionId: terminal.sessionId
        },
        icon: TerminalSquare
      })),
    ...projectBrowserTabs
      .filter((tab) => !usedBrowserTabIds.has(tab.id))
      .map((tab) => ({
        key: `browser:${tab.id}`,
        label: tab.title,
        description: "Browser",
        item: {
          kind: "browser" as const,
          tabId: tab.id
        },
        icon: Globe
      })),
    ...fileTabs
      .filter((tab) => !usedFilePaths.has(tab.path))
      .map((tab) => ({
        key: `file:${tab.path}`,
        label: getLeafName(tab.path),
        description: tab.path,
        item: {
          kind: "file" as const,
          path: tab.path
        },
        icon: FileText
      }))
  ];

  const maxRow = view.gridRows;
  const tilesByPosition = new Map(view.tiles.map((tile) => [`${tile.column}:${tile.row}`, tile]));
  const resolveExternalDropItem = (dataTransfer: DataTransfer): WorkspaceSplitViewItemReference | null => {
    const splitViewItemDrop = readWorkspaceSplitViewItemFromDataTransfer(dataTransfer);
    if (splitViewItemDrop) {
      return splitViewItemDrop.projectId === workspaceId ? splitViewItemDrop.item : null;
    }

    const relativePath = readWorkspaceRelativePathFromDataTransfer(dataTransfer);
    if (!relativePath || relativePath.endsWith("/")) {
      return null;
    }

    return {
      kind: "file",
      path: relativePath
    };
  };
  const declaresExternalDrop = (dataTransfer: DataTransfer): boolean =>
    dataTransferDeclaresWorkspaceSplitViewItem(dataTransfer) || dataTransferDeclaresPathOrFileDrop(dataTransfer);

  return (
    <div
      className={`h-full overflow-hidden bg-card/95 p-3 transition-colors ${isExternalDropActive ? "bg-primary/5" : ""}`}
      onDragOver={(event) => {
        if (draggingTileId || !declaresExternalDrop(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        if (!isExternalDropActive) {
          setIsExternalDropActive(true);
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setIsExternalDropActive(false);
      }}
      onDrop={(event) => {
        if (draggingTileId) {
          return;
        }
        const item = resolveExternalDropItem(event.dataTransfer);
        if (!item) {
          return;
        }
        event.preventDefault();
        onAddItemToView(item);
        setIsExternalDropActive(false);
      }}
    >
      <div
        className="grid h-full gap-3"
        style={{
          gridTemplateColumns: `repeat(${view.gridColumns}, minmax(0, 1fr))`,
          gridTemplateRows: maxRow > 1
            ? "repeat(2, minmax(0, 1fr))"
            : "minmax(0, 1fr)"
        }}
      >
        {Array.from({ length: view.gridColumns * view.gridRows }, (_, index) => {
          const column = (index % view.gridColumns) + 1;
          const row = Math.floor(index / view.gridColumns) + 1;
          const tile = tilesByPosition.get(`${column}:${row}`) ?? null;
          if (!tile) {
            const emptyDropTargetId = `empty:${column}:${row}`;
            const isActiveDropTarget = activeDropTargetId === emptyDropTargetId;
            return (
              <div
                key={`empty:${column}:${row}`}
                className={`relative min-h-0 overflow-hidden rounded-[6px] border border-dashed transition-colors ${isActiveDropTarget ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]" : "border-border/70 bg-background/20"}`}
                style={{
                  gridColumn: `${column} / span 1`,
                  gridRow: `${row} / span 1`
                }}
                onDragOver={(event) => {
                  if (draggingTileId) {
                    event.preventDefault();
                    if (activeDropTargetId !== emptyDropTargetId) {
                      setActiveDropTargetId(emptyDropTargetId);
                    }
                    return;
                  }
                  if (!declaresExternalDrop(event.dataTransfer)) {
                    return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  if (activeDropTargetId !== emptyDropTargetId) {
                    setActiveDropTargetId(emptyDropTargetId);
                  }
                }}
                onDragLeave={() => {
                  if (activeDropTargetId === emptyDropTargetId) {
                    setActiveDropTargetId(null);
                  }
                }}
                onDrop={(event) => {
                  if (draggingTileId) {
                    event.preventDefault();
                    event.stopPropagation();
                    onMoveTileToPosition(draggingTileId, column, row);
                    setActiveDropTargetId(null);
                    setDraggingTileId(null);
                    return;
                  }
                  const item = resolveExternalDropItem(event.dataTransfer);
                  if (!item) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  onAddItemToSlot(item, column, row);
                  setActiveDropTargetId(null);
                  setIsExternalDropActive(false);
                }}
              >
                {isActiveDropTarget ? (
                  <div className="pointer-events-none absolute inset-0 z-10 rounded-[6px] bg-primary/10" aria-hidden="true" />
                ) : null}
                <Card className="h-full rounded-none border-0 bg-transparent shadow-none">
                  <CardContent className="flex h-full items-center justify-center p-6 text-center">
                    {availableItems.length ? (
                      <DropdownMenu
                        align="start"
                        widthClassName="w-72"
                        trigger={(
                          <Button variant="outline">
                            <Plus className="size-4" />
                            Add session
                          </Button>
                        )}
                      >
                        {availableItems.map((entry) => (
                          <DropdownMenuItem
                            key={entry.key}
                            onSelect={() => onAddItemToSlot(entry.item, column, row)}
                            className="gap-3"
                          >
                            <entry.icon className="size-4 shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate text-sm">{entry.label}</div>
                              <div className="truncate text-xs text-muted-foreground">{entry.description}</div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenu>
                    ) : (
                      <div className="space-y-2 text-muted-foreground">
                        <div className="text-sm font-medium text-foreground">Empty slot</div>
                        <div className="text-sm">No other agents, terminals, browsers, or files are available to place here.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          }

          let agent: AgentSession | null = null;
          let terminal: TerminalSession | null = null;
          let browserTab: BrowserTabState | null = null;
          let fileTab: FileEditorTab | null = null;
          const item = tile.item;
          const tileDropTargetId = `tile:${tile.id}`;

          if (item.kind === "agent") {
            agent = agents.find((candidate) => candidate.id === item.agentId) ?? null;
          } else if (item.kind === "terminal") {
            terminal = terminals.find((candidate) => candidate.id === item.terminalId) ?? null;
          } else if (item.kind === "browser") {
            browserTab = projectBrowserTabs.find((candidate) => candidate.id === item.tabId) ?? null;
          } else {
            fileTab = fileTabs.find((candidate) => candidate.path === item.path) ?? null;
          }
          const isMissing = !agent && !terminal && !browserTab && !fileTab;
          const title = agent?.name || terminal?.name || browserTab?.title || fileTab?.path || (item.kind === "file" ? item.path : "Unavailable session");
          const subtitle =
            agent
              ? "Agent"
              : terminal
                ? "Terminal"
                : browserTab
                  ? "Browser"
                  : fileTab
                    ? "File"
                    : item.kind === "file"
                      ? "File"
                      : item.kind === "browser"
                        ? "Browser"
                        : "Missing";
          const isDraggedTile = draggingTileId === tile.id;
          const isActiveDropTarget = activeDropTargetId === tileDropTargetId;
          const focusTile = () => {
            if (agent) {
              onExitSplitView();
              onFocusAgent(agent.id);
              return;
            }
            if (terminal) {
              onExitSplitView();
              onFocusTerminal(terminal.id);
              return;
            }
            if (browserTab) {
              onExitSplitView();
              onFocusBrowserTab(browserTab.id);
              return;
            }
            if (fileTab) {
              onExitSplitView();
              onSetActiveWorkspaceContentTab("file");
              onFocusFileEditorTab(fileTab.path);
              return;
            }
            if (item.kind === "file") {
              onExitSplitView();
              onSetActiveWorkspaceContentTab("file");
              void onOpenFileEditor(item.path, { selectChange: false });
              return;
            }
            if (item.kind === "browser") {
              onExitSplitView();
            }
          };

          return (
            <div
              key={tile.id}
              className={`group relative min-h-0 overflow-hidden rounded-[6px] border bg-background/40 transition-colors ${isDraggedTile ? "border-primary/70 opacity-70" : isActiveDropTarget ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]" : "border-border/70"}`}
              style={{
                gridColumn: `${tile.column} / span 1`,
                gridRow: `${tile.row} / span 1`
              }}
              onDragOver={(event) => {
                if (draggingTileId && draggingTileId !== tile.id) {
                  event.preventDefault();
                  if (activeDropTargetId !== tileDropTargetId) {
                    setActiveDropTargetId(tileDropTargetId);
                  }
                  return;
                }
                if (!declaresExternalDrop(event.dataTransfer)) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                if (activeDropTargetId !== tileDropTargetId) {
                  setActiveDropTargetId(tileDropTargetId);
                }
              }}
              onDragLeave={() => {
                if (activeDropTargetId === tileDropTargetId) {
                  setActiveDropTargetId(null);
                }
              }}
              onDrop={(event) => {
                if (draggingTileId && draggingTileId !== tile.id) {
                  event.preventDefault();
                  event.stopPropagation();
                  onSwapTiles(draggingTileId, tile.id);
                  setActiveDropTargetId(null);
                  setDraggingTileId(null);
                  return;
                }
                const droppedItem = resolveExternalDropItem(event.dataTransfer);
                if (!droppedItem) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                onAddItemToView(droppedItem);
                setActiveDropTargetId(null);
                setIsExternalDropActive(false);
              }}
            >
              {isActiveDropTarget ? (
                <div className="pointer-events-none absolute inset-0 z-10 rounded-[6px] bg-primary/10" aria-hidden="true" />
              ) : null}
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 border-b border-border/60 bg-background/92 px-3 py-2 backdrop-blur">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    draggable
                    className="grid size-7 shrink-0 place-items-center rounded-[4px] border border-border/60 bg-background/60 text-muted-foreground transition hover:text-foreground"
                    onDragStart={(event) => {
                      setDraggingTileId(tile.id);
                      setActiveDropTargetId(null);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", tile.id);
                    }}
                    onDragEnd={() => {
                      setDraggingTileId(null);
                      setActiveDropTargetId(null);
                    }}
                    aria-label="Drag tile to swap positions"
                    title="Drag to swap positions"
                  >
                    <GripVertical className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={focusTile}
                  >
                    <div className="truncate text-sm font-medium text-foreground">{title}</div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {subtitle}
                    </div>
                  </button>
                </div>
                <DropdownMenu
                  trigger={(
                    <Button variant="ghost" size="icon" aria-label="Tile actions">
                      <Ellipsis className="size-4" />
                    </Button>
                  )}
                  widthClassName="w-44"
                >
                  {agent ? (
                    <DropdownMenuItem onSelect={focusTile}>
                      <Focus className="size-4" />
                      Focus agent
                    </DropdownMenuItem>
                  ) : null}
                  {terminal ? (
                    <DropdownMenuItem onSelect={focusTile}>
                      <Focus className="size-4" />
                      Focus terminal
                    </DropdownMenuItem>
                  ) : null}
                  {browserTab ? (
                    <DropdownMenuItem onSelect={focusTile}>
                      <Focus className="size-4" />
                      Focus browser
                    </DropdownMenuItem>
                  ) : null}
                  {item.kind === "file" ? (
                    <DropdownMenuItem onSelect={focusTile}>
                      <Focus className="size-4" />
                      Focus file
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onSelect={() => onMoveTile(tile.id, -1, 0)}>
                    <ArrowLeft className="size-4" />
                    Move left
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onMoveTile(tile.id, 1, 0)}>
                    <ArrowRight className="size-4" />
                    Move right
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onMoveTile(tile.id, 0, -1)}>
                    <ArrowUp className="size-4" />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onMoveTile(tile.id, 0, 1)}>
                    <ArrowDown className="size-4" />
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive onSelect={() => onRemoveTile(tile.id)}>
                    <Trash2 className="size-4" />
                    Remove tile
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>
              <div className="h-full pt-12">
                {isMissing ? (
                  <Card className="h-full rounded-none border-0 bg-card/95">
                    <CardContent className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
                      <div className="space-y-3">
                        <Unplug className="mx-auto size-7 text-primary" />
                        <div className="text-sm font-medium text-foreground">Tile reference is no longer available</div>
                        <div className="text-sm">Remove this tile, or reopen the referenced session or file.</div>
                      </div>
                    </CardContent>
                  </Card>
                ) : agent || terminal ? (
                  <FocusedAgentPanel
                    agent={agent}
                    terminal={terminal}
                    compact
                  />
                ) : browserTab ? (
                  <BrowserTabPanel tab={browserTab} />
                ) : fileTab ? (
                  <FileEditorPanel
                    tabs={[fileTab]}
                    activePath={fileTab.path}
                    showTabStrip={false}
                    resolvedTheme={resolvedTheme}
                    fileEditorThemeId={appSettings.fileEditorThemeId}
                    onChange={(value) => onChangeFileEditorTabContent(fileTab.path, value)}
                    onSave={() => onSaveFileEditorTab(fileTab.path)}
                    onRevert={() => onRevertFileEditorTab(fileTab.path)}
                    onSelectTab={(_path) => undefined}
                    onOpenFileEditor={onOpenFileEditor}
                    onCloseTab={() => onRemoveTile(tile.id)}
                    onClose={() => onRemoveTile(tile.id)}
                    onSetActiveWorkspaceContentTab={onSetActiveWorkspaceContentTab}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
