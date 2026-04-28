import type {
  WorkspaceSplitView,
  WorkspaceSplitViewCollection,
  WorkspaceSplitViewItemReference,
  WorkspaceSplitViewTile
} from "@shared/appTypes";
import { createDefaultWorkspaceSplitViewCollection } from "@shared/appTypes";
import { clampRounded } from "@shared/math";
import type { NormalizedWorkspaceSplitViewCollection } from "./types/internal.types";

export function normalizeWorkspaceSplitViewCollection(value: unknown): NormalizedWorkspaceSplitViewCollection {
  const fallback = createDefaultWorkspaceSplitViewCollection();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      collection: fallback,
      changed: true
    };
  }

  const candidate = value as Partial<WorkspaceSplitViewCollection>;
  const rawViews = Array.isArray(candidate.views) ? candidate.views : [];
  const normalizedViews = rawViews.filter(isWorkspaceSplitView).map((view) => ({
    id: view.id,
    name: view.name.trim() || "Untitled view",
    gridColumns: normalizeGridColumns(view.gridColumns, view.tiles),
    gridRows: normalizeGridRows(view.gridRows, view.tiles),
    tiles: view.tiles.filter(isWorkspaceSplitViewTile).map((tile) => ({
      id: tile.id,
      item: normalizeWorkspaceSplitViewItemReference(tile.item),
      column: clampGridNumber(tile.column, 1, 4),
      row: clampGridNumber(tile.row, 1, 2),
      width: 1,
      height: 1
    })),
    createdAt: view.createdAt,
    updatedAt: view.updatedAt
  }));

  return {
    collection: {
      version: 1,
      views: normalizedViews
    },
    changed: candidate.version !== 1 || normalizedViews.length !== rawViews.length
  };
}

function clampGridNumber(value: number, min: number, max: number): number {
  return clampRounded(value, min, max);
}

function isWorkspaceSplitView(value: unknown): value is WorkspaceSplitView {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<WorkspaceSplitView>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    (candidate.gridColumns === undefined || typeof candidate.gridColumns === "number") &&
    (candidate.gridRows === undefined || typeof candidate.gridRows === "number") &&
    Array.isArray(candidate.tiles) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function isWorkspaceSplitViewTile(value: unknown): value is WorkspaceSplitViewTile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<WorkspaceSplitViewTile>;
  return (
    typeof candidate.id === "string" &&
    isWorkspaceSplitViewItemReference(candidate.item) &&
    typeof candidate.column === "number" &&
    typeof candidate.row === "number" &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number"
  );
}

function isWorkspaceSplitViewItemReference(value: unknown): value is WorkspaceSplitViewItemReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<WorkspaceSplitViewItemReference>;
  return (
    (candidate.kind === "agent" &&
      typeof candidate.agentId === "string" &&
      typeof candidate.sessionId === "string") ||
    (candidate.kind === "terminal" &&
      typeof candidate.terminalId === "string" &&
      typeof candidate.sessionId === "string")
  );
}

function normalizeWorkspaceSplitViewItemReference(
  value: WorkspaceSplitViewItemReference
): WorkspaceSplitViewItemReference {
  return value.kind === "agent"
    ? {
        kind: "agent",
        agentId: value.agentId,
        sessionId: value.sessionId
      }
    : {
        kind: "terminal",
        terminalId: value.terminalId,
        sessionId: value.sessionId
      };
}

function normalizeGridColumns(value: number | undefined, tiles: WorkspaceSplitView["tiles"]): 1 | 2 | 3 | 4 {
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }

  const widestTileWidth = Math.max(...tiles.map((tile) => tile.width || 0), 0);
  if (widestTileWidth >= 12) {
    return 1;
  }
  if (widestTileWidth >= 6) {
    return 2;
  }
  if (widestTileWidth >= 4) {
    return 3;
  }
  return 2;
}

function normalizeGridRows(value: number | undefined, tiles: WorkspaceSplitView["tiles"]): 1 | 2 {
  if (value === 1 || value === 2) {
    return value;
  }

  const tallestRow = Math.max(...tiles.map((tile) => tile.row || 0), 0);
  if (tallestRow >= 2) {
    return 2;
  }
  return 1;
}
