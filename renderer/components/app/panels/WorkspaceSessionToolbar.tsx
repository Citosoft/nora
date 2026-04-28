import {
  useWorkspaceSessionPanelActions,
  useWorkspaceSessionPanelData
} from "@/components/app/context/workspaceSessionPanelContext";
import { WORKSPACE_SPLIT_VIEW_GRID_PRESETS } from "@/components/app/logic/workspaceSplitViewUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { WorkspaceSplitView } from "@shared/appTypes";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function WorkspaceSessionToolbar() {
  const {
    splitViewCollection,
    splitViewsLoading,
    splitViewsErrorMessage,
    activeView: activeSplitView,
    activeGridColumns,
    activeGridRows,
    addFocusedLabel,
    canAddCurrentItem
  } = useWorkspaceSessionPanelData();
  const {
    onGridPresetChange,
    onAddFocused,
    onRenameActiveView,
    onDeleteActiveView
  } = useWorkspaceSessionPanelActions();
  const activeViewId = activeSplitView?.id ?? null;
  const activeView = splitViewCollection.views.find((view) => view.id === activeViewId) ?? null;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  useEffect(() => {
    if (!activeView) {
      setIsRenaming(false);
      setRenameDraft("");
      return;
    }

    setRenameDraft(activeView.name);
  }, [activeView?.id, activeView?.name]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeView ? (
        <>
          <Select
            value={`${activeGridColumns}x${activeGridRows}`}
            onChange={(event) => {
              const [columns, rows] = event.target.value.split("x").map((value) => Number.parseInt(value, 10));
              onGridPresetChange(
                columns as WorkspaceSplitView["gridColumns"],
                rows as WorkspaceSplitView["gridRows"]
              );
            }}
            className="h-9 w-[92px]"
          >
            {WORKSPACE_SPLIT_VIEW_GRID_PRESETS.map((preset) => (
              <option key={`${preset.columns}x${preset.rows}`} value={`${preset.columns}x${preset.rows}`}>
                {preset.label}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={onAddFocused} disabled={!canAddCurrentItem}>
            <Plus className="size-4" />
            {addFocusedLabel}
          </Button>
          {isRenaming ? (
            <>
              <Input
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                className="h-9 w-[160px]"
                placeholder="View name"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onRenameActiveView(renameDraft);
                    setIsRenaming(false);
                  } else if (event.key === "Escape") {
                    setRenameDraft(activeView.name);
                    setIsRenaming(false);
                  }
                }}
                autoFocus
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRenameActiveView(renameDraft);
                  setIsRenaming(false);
                }}
              >
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsRenaming(true)}>
              <Pencil className="size-4" />
              Rename
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onDeleteActiveView}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </>
      ) : null}
      {splitViewsLoading ? <div className="text-xs text-muted-foreground">Loading views...</div> : null}
      {splitViewsErrorMessage ? <div className="text-xs text-destructive">{splitViewsErrorMessage}</div> : null}
    </div>
  );
}
