import { useWorkspaceSessionContext } from "@/components/app/context/workspaceSessionContext";
import { useWorkspaceSessionPanelActions } from "@/components/app/context/workspaceSessionPanelContext";
import { FocusedAgentPanel } from "@/components/app/panels/FocusedAgentPanel";
import type { WorkspaceSplitViewPanelProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type {
  AgentSession,
  TerminalSession,
  WorkspaceSplitViewItemReference,
} from "@shared/appTypes";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Ellipsis, Focus, GripVertical, Plus, TerminalSquare, Trash2, Unplug } from "lucide-react";
import { useState } from "react";

export function WorkspaceSplitViewPanel({ view }: WorkspaceSplitViewPanelProps) {
  const {
    workspace
  } = useWorkspaceSessionContext();
  const {
    onExitSplitView,
    onFocusAgent,
    onFocusTerminal,
    onAddItemToSlot,
    onMoveTile,
    onMoveTileToPosition,
    onSwapTiles,
    onRemoveTile
  } = useWorkspaceSessionPanelActions();
  const agents = workspace?.agents ?? [];
  const terminals = workspace?.terminals ?? [];
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null);
  const [activeDropTargetId, setActiveDropTargetId] = useState<string | null>(null);
  const usedAgentIds = new Set(view.tiles.flatMap((tile) => tile.item.kind === "agent" ? [tile.item.agentId] : []));
  const usedTerminalIds = new Set(view.tiles.flatMap((tile) => tile.item.kind === "terminal" ? [tile.item.terminalId] : []));
  const availableItems: Array<{ key: string; label: string; item: WorkspaceSplitViewItemReference }> = [
    ...agents
      .filter((agent) => !usedAgentIds.has(agent.id))
      .map((agent) => ({
        key: `agent:${agent.id}`,
        label: `${agent.name} (${agent.toolLabel})`,
        item: {
          kind: "agent" as const,
          agentId: agent.id,
          sessionId: agent.sessionId
        }
      })),
    ...terminals
      .filter((terminal) => !usedTerminalIds.has(terminal.id))
      .map((terminal) => ({
        key: `terminal:${terminal.id}`,
        label: `${terminal.name} (${terminal.shellLabel})`,
        item: {
          kind: "terminal" as const,
          terminalId: terminal.id,
          sessionId: terminal.sessionId
        }
      }))
  ];

  const maxRow = view.gridRows;
  const tilesByPosition = new Map(view.tiles.map((tile) => [`${tile.column}:${tile.row}`, tile]));

  return (
    <div className="h-full overflow-hidden bg-card/95 p-3">
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
                  if (!draggingTileId) {
                    return;
                  }
                  event.preventDefault();
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
                  if (!draggingTileId) {
                    return;
                  }
                  event.preventDefault();
                  onMoveTileToPosition(draggingTileId, column, row);
                  setActiveDropTargetId(null);
                  setDraggingTileId(null);
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
                          >
                            <TerminalSquare className="size-4" />
                            <span className="truncate">{entry.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenu>
                    ) : (
                      <div className="space-y-2 text-muted-foreground">
                        <div className="text-sm font-medium text-foreground">Empty slot</div>
                        <div className="text-sm">No other agents or terminals are available to place here.</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          }

          let agent: AgentSession | null = null;
          let terminal: TerminalSession | null = null;
          const item = tile.item;
          const tileDropTargetId = `tile:${tile.id}`;

          if (item.kind === "agent") {
            agent = agents.find((candidate) => candidate.id === item.agentId) ?? null;
          } else {
            terminal = terminals.find((candidate) => candidate.id === item.terminalId) ?? null;
          }
          const isMissing = !agent && !terminal;
          const title = agent?.name || terminal?.name || "Unavailable session";
          const isDraggedTile = draggingTileId === tile.id;
          const isActiveDropTarget = activeDropTargetId === tileDropTargetId;

          return (
            <div
              key={tile.id}
              className={`group relative min-h-0 overflow-hidden rounded-[6px] border bg-background/40 transition-colors ${isDraggedTile ? "border-primary/70 opacity-70" : isActiveDropTarget ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]" : "border-border/70"}`}
              style={{
                gridColumn: `${tile.column} / span 1`,
                gridRow: `${tile.row} / span 1`
              }}
              onDragOver={(event) => {
                if (!draggingTileId || draggingTileId === tile.id) {
                  return;
                }
                event.preventDefault();
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
                if (!draggingTileId || draggingTileId === tile.id) {
                  return;
                }
                event.preventDefault();
                onSwapTiles(draggingTileId, tile.id);
                setActiveDropTargetId(null);
                setDraggingTileId(null);
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
                    onClick={() => {
                      if (agent) {
                        onExitSplitView();
                        onFocusAgent(agent.id);
                        return;
                      }
                      if (terminal) {
                        onExitSplitView();
                        onFocusTerminal(terminal.id);
                      }
                    }}
                  >
                    <div className="truncate text-sm font-medium text-foreground">{title}</div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {agent ? "Agent" : terminal ? "Terminal" : "Missing"}
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
                    <DropdownMenuItem onSelect={() => {
                      onExitSplitView();
                      onFocusAgent(agent.id);
                    }}>
                      <Focus className="size-4" />
                      Focus agent
                    </DropdownMenuItem>
                  ) : null}
                  {terminal ? (
                    <DropdownMenuItem onSelect={() => {
                      onExitSplitView();
                      onFocusTerminal(terminal.id);
                    }}>
                      <Focus className="size-4" />
                      Focus terminal
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
                        <div className="text-sm font-medium text-foreground">Session reference is no longer available</div>
                        <div className="text-sm">Remove this tile or relaunch the referenced session.</div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <FocusedAgentPanel
                    agent={agent}
                    terminal={terminal}
                    compact
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
