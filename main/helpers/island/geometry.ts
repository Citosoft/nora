import type { Rectangle } from "electron";
import type { IslandDisplay, IslandPlacement } from "@main/types/island/island.types";

/**
 * The 14" MacBook Pro's default scaled display and its notch, in points. Apple publishes no notch API, so other
 * notched models are scaled from this one by width.
 */
const NOTCH_REFERENCE = { displayWidth: 1512, notchWidth: 185, notchHeight: 32 };
/**
 * Notched built-in panels keep a ~1.54 aspect ratio in every scaled mode; the 16:10 panels before them are 1.6.
 * This still identifies the notch when the menu bar auto-hides and the work area reaches the top of the screen.
 */
const NOTCHED_ASPECT_RATIO = { min: 1.53, max: 1.555 };
/** A visible menu bar is 24pt tall on displays without a notch and grows to the notch's height on notched ones. */
const NOTCHED_MENU_BAR_MIN_HEIGHT = 30;
/**
 * Big enough for the expanded island at its largest size; the transparent remainder lets clicks through until the
 * pointer is on the island.
 */
export const ISLAND_WINDOW_SIZE = { width: 640, height: 440 };

function menuBarHeight(display: IslandDisplay): number {
  return Math.max(0, display.workArea.y - display.bounds.y);
}

function hasNotch(display: IslandDisplay): boolean {
  if (!display.internal || display.bounds.height <= 0) return false;
  const aspectRatio = display.bounds.width / display.bounds.height;
  return menuBarHeight(display) >= NOTCHED_MENU_BAR_MIN_HEIGHT
    || (aspectRatio >= NOTCHED_ASPECT_RATIO.min && aspectRatio <= NOTCHED_ASPECT_RATIO.max);
}

function islandWindowBounds(display: IslandDisplay): Rectangle {
  return {
    x: Math.round(display.bounds.x + (display.bounds.width - ISLAND_WINDOW_SIZE.width) / 2),
    y: display.bounds.y,
    ...ISLAND_WINDOW_SIZE
  };
}

/** Where the island goes on `display`, or null when it has no notch to wrap. */
export function islandPlacement(display: IslandDisplay): IslandPlacement | null {
  if (!hasNotch(display)) return null;
  const scale = display.bounds.width / NOTCH_REFERENCE.displayWidth;
  const measuredHeight = menuBarHeight(display);
  return {
    displayId: display.id,
    bounds: islandWindowBounds(display),
    geometry: {
      notchWidth: Math.round(NOTCH_REFERENCE.notchWidth * scale),
      notchHeight: measuredHeight >= NOTCHED_MENU_BAR_MIN_HEIGHT ? measuredHeight : Math.round(NOTCH_REFERENCE.notchHeight * scale)
    }
  };
}

export function islandPlacements(displays: readonly IslandDisplay[]): IslandPlacement[] {
  return displays.flatMap((display) => islandPlacement(display) ?? []);
}
