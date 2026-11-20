import type { AppUiSpec } from "@shared/types/apps/apps.types";
import { appPanelLocations } from "@shared/apps/panelLayout";

/** Renderer metadata only: never persisted or exposed as part of the builder's catalog. */
export const PANEL_ID_PROP = "__noraPanelId";

export function renderedPanelId(props: Readonly<Record<string, unknown>>): string {
  const id = props[PANEL_ID_PROP];
  return typeof id === "string" ? id : "";
}

export function panelLayoutRenderSpec(ui: AppUiSpec): AppUiSpec {
  const locations = appPanelLocations(ui);
  return { ...ui, elements: Object.fromEntries(Object.entries(ui.elements).map(([id, element]) =>
    [id, locations.has(id) ? { ...element, props: { ...element.props, [PANEL_ID_PROP]: id } } : element])) };
}
