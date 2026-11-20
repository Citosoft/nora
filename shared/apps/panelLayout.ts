import type { AppUiSpec } from "@shared/types/apps/apps.types";
import type { AppPanelLocation, AppPanelMove } from "@shared/types/apps/panelLayout.types";

/** Repeated panels share a spec node: moving one would move every instance, so only static layouts are editable. */
export function appPanelLocations(ui: AppUiSpec): Map<string, AppPanelLocation> {
  const locations = new Map<string, AppPanelLocation>();
  const references = new Map<string, number>();
  for (const element of Object.values(ui.elements)) {
    for (const id of [...(element.children ?? []), ...Object.values(element.slots ?? {}).flat()]) references.set(id, (references.get(id) ?? 0) + 1);
  }
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    visited.add(id);
    const element = ui.elements[id];
    if (!element || element.repeat) return;
    for (const [index, childId] of (element.children ?? []).entries()) {
      if (references.get(childId) !== 1) continue;
      if ((element.type === "Grid" || element.type === "Stack") && ui.elements[childId]?.type === "Card") locations.set(childId, { parentId: id, index });
      visit(childId);
    }
    for (const childId of Object.values(element.slots ?? {}).flat()) if (references.get(childId) === 1) visit(childId);
  };
  visit(ui.root);
  return locations;
}

/** Reparents whole panels without changing their contents, sources, actions, or the meaning of positional Tabs children. */
export function moveAppPanel<T extends AppUiSpec>(ui: T, move: AppPanelMove): T {
  const locations = appPanelLocations(ui);
  const source = locations.get(move.panelId), target = locations.get(move.targetId);
  if (!source || !target) throw new Error("These panels cannot be moved. Reopen the app and try again.");
  if (move.panelId === move.targetId) return ui;
  const descendants = new Set<string>();
  const visit = (id: string): void => {
    if (descendants.has(id)) return;
    descendants.add(id);
    const element = ui.elements[id];
    for (const childId of [...(element?.children ?? []), ...Object.values(element?.slots ?? {}).flat()]) visit(childId);
  };
  visit(move.panelId);
  if (descendants.has(target.parentId)) throw new Error("A panel cannot be moved inside itself.");

  const sourceParent = ui.elements[source.parentId];
  const targetParent = ui.elements[target.parentId];
  const remaining = (sourceParent.children ?? []).filter((id) => id !== move.panelId);
  const children = source.parentId === target.parentId ? remaining : [...(targetParent.children ?? [])];
  children.splice(children.indexOf(move.targetId) + (move.placement === "after" ? 1 : 0), 0, move.panelId);
  if (source.parentId === target.parentId && children.every((id, index) => id === sourceParent.children?.[index])) return ui;
  return { ...ui, elements: { ...ui.elements,
    [source.parentId]: { ...sourceParent, children: remaining },
    [target.parentId]: { ...targetParent, children }
  } };
}

/** Arrow keys follow panel order in the current layout without moving headings or changing tab assignments. */
export function adjacentAppPanelMove(ui: AppUiSpec, panelId: string, direction: "previous" | "next"): AppPanelMove | null {
  const locations = appPanelLocations(ui);
  const current = locations.get(panelId);
  if (!current) return null;
  const siblings = [...locations].filter(([, location]) => location.parentId === current.parentId).map(([id]) => id);
  const targetId = siblings[siblings.indexOf(panelId) + (direction === "previous" ? -1 : 1)];
  return targetId ? { panelId, targetId, placement: direction === "previous" ? "before" : "after" } : null;
}
