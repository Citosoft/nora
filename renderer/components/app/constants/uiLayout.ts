/** Default and bounds for workbench sidebars (workspace tree, changes panel). */

export const COLLAPSED_SIDEBAR_WIDTH = 52;

export const DEFAULT_WORKSPACE_SIDEBAR_WIDTH = 320;
export const DEFAULT_CHANGES_SIDEBAR_WIDTH = 440;

export const MIN_WORKSPACE_SIDEBAR_WIDTH = 240;
export const MAX_WORKSPACE_SIDEBAR_WIDTH = 640;

export const MIN_CHANGES_SIDEBAR_WIDTH = 280;
export const MAX_CHANGES_SIDEBAR_WIDTH = 760;

export const WORKSPACE_SIDEBAR_AUTO_COLLAPSE_WIDTH = MIN_WORKSPACE_SIDEBAR_WIDTH;
export const CHANGES_SIDEBAR_AUTO_COLLAPSE_WIDTH = MIN_CHANGES_SIDEBAR_WIDTH;

export const clampSidebarWidth = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));
