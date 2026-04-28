import type { GridColumns, GridPosition, GridRows } from "@/components/app/types/component.types";
import type {
  AgentSession,
  TerminalSession,
  WorkspaceSplitView,
  WorkspaceSplitViewCollection,
  WorkspaceSplitViewItemReference,
  WorkspaceSplitViewTile
} from "@shared/appTypes";
import { clampRounded } from "@shared/math";

export const WORKSPACE_SPLIT_VIEW_GRID_OPTIONS = [1, 2, 3, 4] as const;
export const DEFAULT_WORKSPACE_SPLIT_VIEW_GRID_COLUMNS = 2 as const;
export const DEFAULT_WORKSPACE_SPLIT_VIEW_GRID_ROWS = 2 as const;

export const WORKSPACE_SPLIT_VIEW_GRID_PRESETS = [
  { columns: 1, rows: 2, label: "1 x 2" },
  { columns: 2, rows: 2, label: "2 x 2" },
  { columns: 3, rows: 2, label: "3 x 2" },
  { columns: 4, rows: 2, label: "4 x 2" }
] as const;

export function createWorkspaceSplitView(
  name: string,
  initialItem?: WorkspaceSplitViewItemReference | null,
  gridColumns: GridColumns = DEFAULT_WORKSPACE_SPLIT_VIEW_GRID_COLUMNS,
  gridRows: GridRows = DEFAULT_WORKSPACE_SPLIT_VIEW_GRID_ROWS
): WorkspaceSplitView {
  const now = new Date().toISOString();
  return {
    id: createWorkspaceSplitViewId(),
    name,
    gridColumns,
    gridRows,
    tiles: initialItem ? [createWorkspaceSplitViewTile(initialItem, { column: 1, row: 1 })] : [],
    createdAt: now,
    updatedAt: now
  };
}

export function renameWorkspaceSplitView(view: WorkspaceSplitView, name: string): WorkspaceSplitView {
  return {
    ...view,
    name: name.trim() || view.name,
    updatedAt: new Date().toISOString()
  };
}

export function setWorkspaceSplitViewGridShape(
  view: WorkspaceSplitView,
  gridColumns: GridColumns,
  gridRows: GridRows
): WorkspaceSplitView {
  const orderedTiles = [...view.tiles].sort(compareWorkspaceSplitViewTiles);
  const nextTiles = orderedTiles.slice(0, gridColumns * gridRows).map((tile, index) => {
    const column = (index % gridColumns) + 1;
    const row = Math.floor(index / gridColumns) + 1;
    return createWorkspaceSplitViewTile(tile.item, { column, row }, tile.id);
  });

  return {
    ...view,
    gridColumns,
    gridRows,
    tiles: nextTiles,
    updatedAt: new Date().toISOString()
  };
}

export function appendWorkspaceSplitViewTile(
  view: WorkspaceSplitView,
  item: WorkspaceSplitViewItemReference
): WorkspaceSplitView {
  const existingTile = view.tiles.find((tile) => isSameWorkspaceSplitViewItem(tile.item, item));
  if (existingTile) {
    return view;
  }
  if (view.tiles.length >= getWorkspaceSplitViewCapacity(view)) {
    return view;
  }

  return {
    ...view,
    tiles: [...view.tiles, createWorkspaceSplitViewTile(item, findNextWorkspaceSplitViewTilePosition(view))],
    updatedAt: new Date().toISOString()
  };
}

export function addWorkspaceSplitViewTileAtPosition(
  view: WorkspaceSplitView,
  item: WorkspaceSplitViewItemReference,
  position: GridPosition
): WorkspaceSplitView {
  const existingTile = view.tiles.find((tile) => isSameWorkspaceSplitViewItem(tile.item, item));
  if (existingTile) {
    return view;
  }
  if (view.tiles.length >= getWorkspaceSplitViewCapacity(view)) {
    return view;
  }
  if (view.tiles.some((tile) => tile.column === position.column && tile.row === position.row)) {
    return view;
  }

  return {
    ...view,
    tiles: [...view.tiles, createWorkspaceSplitViewTile(item, position)],
    updatedAt: new Date().toISOString()
  };
}

export function removeWorkspaceSplitViewTile(view: WorkspaceSplitView, tileId: string): WorkspaceSplitView {
  const remainingTiles = view.tiles.filter((tile) => tile.id !== tileId);
  const nextTiles = remainingTiles
    .sort(compareWorkspaceSplitViewTiles)
    .map((tile, index) => createWorkspaceSplitViewTile(tile.item, {
      column: (index % view.gridColumns) + 1,
      row: Math.floor(index / view.gridColumns) + 1
    }, tile.id));

  return {
    ...view,
    tiles: nextTiles,
    updatedAt: new Date().toISOString()
  };
}

export function tryMoveWorkspaceSplitViewTile(
  view: WorkspaceSplitView,
  tileId: string,
  deltaColumn: number,
  deltaRow: number
): WorkspaceSplitView {
  const tile = view.tiles.find((candidate) => candidate.id === tileId);
  if (!tile) {
    return view;
  }

  const nextPosition = {
    column: clamp(tile.column + deltaColumn, 1, view.gridColumns),
    row: clamp(tile.row + deltaRow, 1, view.gridRows)
  };

  if (nextPosition.column === tile.column && nextPosition.row === tile.row) {
    return view;
  }

  const occupant = view.tiles.find((candidate) =>
    candidate.id !== tileId &&
    candidate.column === nextPosition.column &&
    candidate.row === nextPosition.row
  );

  if (!occupant) {
    return updateWorkspaceSplitViewTilePosition(view, tileId, nextPosition);
  }

  return swapWorkspaceSplitViewTiles(view, tileId, occupant.id);
}

export function swapWorkspaceSplitViewTiles(
  view: WorkspaceSplitView,
  sourceTileId: string,
  targetTileId: string
): WorkspaceSplitView {
  const sourceTile = view.tiles.find((tile) => tile.id === sourceTileId);
  const targetTile = view.tiles.find((tile) => tile.id === targetTileId);

  if (!sourceTile || !targetTile || sourceTile.id === targetTile.id) {
    return view;
  }

  return {
    ...view,
    tiles: view.tiles.map((tile) => {
      if (tile.id === sourceTile.id) {
        return createWorkspaceSplitViewTile(tile.item, {
          column: targetTile.column,
          row: targetTile.row
        }, tile.id);
      }
      if (tile.id === targetTile.id) {
        return createWorkspaceSplitViewTile(tile.item, {
          column: sourceTile.column,
          row: sourceTile.row
        }, tile.id);
      }
      return tile;
    }),
    updatedAt: new Date().toISOString()
  };
}

export function moveWorkspaceSplitViewTileToPosition(
  view: WorkspaceSplitView,
  tileId: string,
  position: GridPosition
): WorkspaceSplitView {
  const tile = view.tiles.find((candidate) => candidate.id === tileId);
  if (!tile) {
    return view;
  }

  const nextPosition = {
    column: clamp(position.column, 1, view.gridColumns),
    row: clamp(position.row, 1, view.gridRows)
  };

  if (nextPosition.column === tile.column && nextPosition.row === tile.row) {
    return view;
  }

  const occupant = view.tiles.find((candidate) =>
    candidate.id !== tileId &&
    candidate.column === nextPosition.column &&
    candidate.row === nextPosition.row
  );

  if (occupant) {
    return swapWorkspaceSplitViewTiles(view, tileId, occupant.id);
  }

  return updateWorkspaceSplitViewTilePosition(view, tileId, nextPosition);
}

export function getNextWorkspaceSplitViewName(collection: WorkspaceSplitViewCollection): string {
  let index = collection.views.length + 1;
  let nextName = `View ${index}`;
  const usedNames = new Set(collection.views.map((view) => view.name));
  while (usedNames.has(nextName)) {
    index += 1;
    nextName = `View ${index}`;
  }
  return nextName;
}

export function getWorkspaceSplitViewCapacity(view: Pick<WorkspaceSplitView, "gridColumns" | "gridRows">): number {
  return view.gridColumns * view.gridRows;
}

export function createWorkspaceSplitViewItemReference(
  agent: AgentSession | null,
  terminal: TerminalSession | null
): WorkspaceSplitViewItemReference | null {
  if (agent) {
    return {
      kind: "agent",
      agentId: agent.id,
      sessionId: agent.sessionId
    };
  }

  if (terminal) {
    return {
      kind: "terminal",
      terminalId: terminal.id,
      sessionId: terminal.sessionId
    };
  }

  return null;
}

export function isSameWorkspaceSplitViewItem(
  left: WorkspaceSplitViewItemReference,
  right: WorkspaceSplitViewItemReference
): boolean {
  return left.kind === "agent" && right.kind === "agent"
    ? left.agentId === right.agentId
    : left.kind === "terminal" && right.kind === "terminal"
      ? left.terminalId === right.terminalId
      : false;
}

function updateWorkspaceSplitViewTilePosition(
  view: WorkspaceSplitView,
  tileId: string,
  position: GridPosition
): WorkspaceSplitView {
  return {
    ...view,
    tiles: view.tiles.map((tile) =>
      tile.id === tileId ? createWorkspaceSplitViewTile(tile.item, position, tile.id) : tile
    ),
    updatedAt: new Date().toISOString()
  };
}

function createWorkspaceSplitViewTile(
  item: WorkspaceSplitViewItemReference,
  position: GridPosition,
  id = createWorkspaceSplitViewId()
): WorkspaceSplitViewTile {
  return {
    id,
    item,
    column: position.column,
    row: position.row,
    width: 1,
    height: 1
  };
}

function findNextWorkspaceSplitViewTilePosition(view: WorkspaceSplitView): GridPosition {
  const occupied = new Set(view.tiles.map((tile) => `${tile.column}:${tile.row}`));
  for (let row = 1; row <= view.gridRows; row += 1) {
    for (let column = 1; column <= view.gridColumns; column += 1) {
      if (!occupied.has(`${column}:${row}`)) {
        return { column, row };
      }
    }
  }

  return { column: 1, row: 1 };
}

function compareWorkspaceSplitViewTiles(left: WorkspaceSplitViewTile, right: WorkspaceSplitViewTile): number {
  return left.row === right.row ? left.column - right.column : left.row - right.row;
}

function clamp(value: number, min: number, max: number): number {
  return clampRounded(value, min, max);
}

function createWorkspaceSplitViewId(): string {
  return crypto.randomUUID();
}
