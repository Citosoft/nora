import type { AppUiSpec } from "@shared/types/apps/apps.types";
import type { AppPanelMove } from "@shared/types/apps/panelLayout.types";

export interface AppPanelLayoutState {
  ui: AppUiSpec | null;
  dragging: string | null;
  saving: boolean;
  message: string | null;
  error: string | null;
  setDragging(id: string | null): void;
  move(move: AppPanelMove): void;
}
