import { useStateStore } from "@json-render/react";
import { useAppRuntimeContext } from "@/components/app/context/appRuntimeContext";
import { propText } from "@/components/app/logic/apps/propText";
import type { AppRow, AppRowClick } from "@/components/app/types/apps.types";

/** Rows are keyed by their `id` when they have one, so a selected row stays highlighted after its source reloads. */
export const sameRow = (a: AppRow | null, b: AppRow): boolean => !!a && (a.id !== undefined && b.id !== undefined ? a.id === b.id : JSON.stringify(a) === JSON.stringify(b));

/** A clickable row writes itself to `selectPath` (for a record view) and runs the action named by `rowAction` with the row as its item. */
export function useAppRowClick(rowAction: unknown, selectPath: unknown): AppRowClick {
  const runtime = useAppRuntimeContext();
  const { get, set } = useStateStore();
  const actionId = propText(rowAction);
  const path = propText(selectPath);
  const current = path ? get(path) : undefined;
  const selected = current && typeof current === "object" && !Array.isArray(current) ? current as AppRow : null;
  if (!actionId && !path) return { onRow: null, selected };
  return { selected, onRow: (row) => { if (path) set(path, row); if (actionId) runtime.runAction(actionId, row); } };
}
