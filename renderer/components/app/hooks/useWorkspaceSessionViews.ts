import { readStoredWorkspaceSplitViewSelections, writeStoredWorkspaceSplitViewSelection } from "@/components/app/logic/appPersistence";
import {
  addWorkspaceSplitViewTileAtPosition,
  appendWorkspaceSplitViewTile,
  createWorkspaceSplitView,
  createWorkspaceSplitViewItemReference,
  DEFAULT_WORKSPACE_SPLIT_VIEW_GRID_COLUMNS,
  DEFAULT_WORKSPACE_SPLIT_VIEW_GRID_ROWS,
  getNextWorkspaceSplitViewName,
  getWorkspaceSplitViewCapacity,
  isSameWorkspaceSplitViewItem,
  moveWorkspaceSplitViewTileToPosition,
  removeWorkspaceSplitViewTile,
  renameWorkspaceSplitView,
  setWorkspaceSplitViewGridShape,
  swapWorkspaceSplitViewTiles,
  tryMoveWorkspaceSplitViewTile
} from "@/components/app/logic/workspaceSplitViewUtils";
import type { UseWorkspaceSessionViewsArgs } from "@/components/app/types/component.types";
import type {
  WorkspaceSplitView,
  WorkspaceSplitViewCollection
} from "@shared/appTypes";
import { useEffect, useMemo, useState } from "react";

export function useWorkspaceSessionViews({
  projectId,
  agent,
  terminal,
  defaultGridColumns,
  defaultGridRows,
  rememberLastViewPerWorkspace,
  confirmDeleteView,
  splitViewCollection,
  onSaveSplitViews,
  onError
}: UseWorkspaceSessionViewsArgs) {
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const activeView = useMemo(
    () => splitViewCollection.views.find((view) => view.id === activeViewId) ?? null,
    [activeViewId, splitViewCollection.views]
  );
  const currentItemReference = createWorkspaceSplitViewItemReference(agent, terminal);
  const canAddCurrentItem = !!(
    activeView &&
    currentItemReference &&
    !activeView.tiles.some((tile) => isSameWorkspaceSplitViewItem(tile.item, currentItemReference)) &&
    activeView.tiles.length < getWorkspaceSplitViewCapacity(activeView)
  );
  const addFocusedLabel = !currentItemReference
    ? "No focused session"
    : canAddCurrentItem
      ? "Add focused"
      : activeView && currentItemReference && activeView.tiles.some((tile) => isSameWorkspaceSplitViewItem(tile.item, currentItemReference))
        ? "Already in view"
        : "View full";
  const activeGridColumns = activeView?.gridColumns ?? DEFAULT_WORKSPACE_SPLIT_VIEW_GRID_COLUMNS;
  const activeGridRows = activeView?.gridRows ?? DEFAULT_WORKSPACE_SPLIT_VIEW_GRID_ROWS;

  useEffect(() => {
    if (!projectId) {
      setActiveViewId(null);
      return;
    }

    const storedViewId = rememberLastViewPerWorkspace
      ? readStoredWorkspaceSplitViewSelections()[projectId] ?? null
      : null;

    setActiveViewId((current) => {
      if (current && splitViewCollection.views.some((view) => view.id === current)) {
        return current;
      }
      if (storedViewId && splitViewCollection.views.some((view) => view.id === storedViewId)) {
        return storedViewId;
      }
      return null;
    });
  }, [projectId, rememberLastViewPerWorkspace, splitViewCollection.views]);

  useEffect(() => {
    if (!projectId || !rememberLastViewPerWorkspace) {
      return;
    }

    const nextActiveViewId =
      activeViewId && splitViewCollection.views.some((view) => view.id === activeViewId)
        ? activeViewId
        : null;
    writeStoredWorkspaceSplitViewSelection(projectId, nextActiveViewId);
  }, [activeViewId, projectId, rememberLastViewPerWorkspace, splitViewCollection.views]);

  const persistCollection = async (
    updater: (current: WorkspaceSplitViewCollection) => WorkspaceSplitViewCollection
  ): Promise<void> => {
    if (!projectId) {
      return;
    }

    try {
      const saved = await onSaveSplitViews(projectId, updater(splitViewCollection));
      if (activeViewId && !saved.views.some((view) => view.id === activeViewId)) {
        setActiveViewId(null);
      }
    } catch (error) {
      onError(error);
    }
  };

  const createView = async (): Promise<void> => {
    const nextView = createWorkspaceSplitView(
      getNextWorkspaceSplitViewName(splitViewCollection),
      currentItemReference,
      defaultGridColumns,
      defaultGridRows
    );
    await persistCollection((current) => ({
      ...current,
      views: [...current.views, nextView]
    }));
    setActiveViewId(nextView.id);
  };

  const renameActiveView = async (nextName: string): Promise<void> => {
    if (!activeView) {
      return;
    }

    const normalizedName = nextName.trim();
    if (!normalizedName) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.map((view) => view.id === activeView.id ? renameWorkspaceSplitView(view, normalizedName) : view)
    }));
  };

  const deleteActiveView = async (): Promise<void> => {
    if (!activeView) {
      return;
    }

    if (confirmDeleteView && !window.confirm(`Delete "${activeView.name}"?`)) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.filter((view) => view.id !== activeView.id)
    }));
    setActiveViewId(null);
  };

  const deleteViewById = async (viewId: string): Promise<void> => {
    const view = splitViewCollection.views.find((entry) => entry.id === viewId);
    if (!view) {
      return;
    }

    if (confirmDeleteView && !window.confirm(`Delete "${view.name}"?`)) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.filter((entry) => entry.id !== viewId)
    }));
    if (activeViewId === viewId) {
      setActiveViewId(null);
    }
  };

  const addFocusedItem = async (): Promise<void> => {
    if (!activeView || !currentItemReference) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.map((view) =>
        view.id === activeView.id ? appendWorkspaceSplitViewTile(view, currentItemReference) : view
      )
    }));
  };

  const addItemToSlot = async (
    item: NonNullable<ReturnType<typeof createWorkspaceSplitViewItemReference>>,
    column: number,
    row: number
  ): Promise<void> => {
    if (!activeView) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.map((view) =>
        view.id === activeView.id ? addWorkspaceSplitViewTileAtPosition(view, item, { column, row }) : view
      )
    }));
  };

  const moveTile = async (tileId: string, deltaColumn: number, deltaRow: number): Promise<void> => {
    if (!activeView) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.map((view) =>
        view.id === activeView.id ? tryMoveWorkspaceSplitViewTile(view, tileId, deltaColumn, deltaRow) : view
      )
    }));
  };

  const moveTileToPosition = async (tileId: string, column: number, row: number): Promise<void> => {
    if (!activeView) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.map((view) =>
        view.id === activeView.id ? moveWorkspaceSplitViewTileToPosition(view, tileId, { column, row }) : view
      )
    }));
  };

  const setGridPreset = async (
    gridColumns: WorkspaceSplitView["gridColumns"],
    gridRows: WorkspaceSplitView["gridRows"]
  ): Promise<void> => {
    if (!activeView) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.map((view) =>
        view.id === activeView.id ? setWorkspaceSplitViewGridShape(view, gridColumns, gridRows) : view
      )
    }));
  };

  const swapTiles = async (sourceTileId: string, targetTileId: string): Promise<void> => {
    if (!activeView) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.map((view) =>
        view.id === activeView.id ? swapWorkspaceSplitViewTiles(view, sourceTileId, targetTileId) : view
      )
    }));
  };

  const removeTile = async (tileId: string): Promise<void> => {
    if (!activeView) {
      return;
    }

    await persistCollection((current) => ({
      ...current,
      views: current.views.map((view) =>
        view.id === activeView.id ? removeWorkspaceSplitViewTile(view, tileId) : view
      )
    }));
  };

  const api = {
    activeViewId,
    setActiveViewId,
    activeView,
    activeGridColumns,
    activeGridRows,
    addFocusedLabel,
    canAddCurrentItem,
    createView,
    renameActiveView,
    deleteActiveView,
    deleteViewById,
    addFocusedItem,
    addItemToSlot,
    moveTile,
    moveTileToPosition,
    setGridPreset,
    swapTiles,
    removeTile
  };

  return api;
}

export type WorkspaceSessionViewsApi = ReturnType<typeof useWorkspaceSessionViews>;
