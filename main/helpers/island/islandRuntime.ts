import type { IslandDemoScenario, IslandView } from "@shared/types/island/island.types";
import type { IslandContent, IslandPlacement, IslandRuntime, IslandRuntimeDeps, IslandWindowHandle } from "@main/types/island/island.types";
import { islandPlacements } from "./geometry";
import { islandDemoWork } from "./islandDemo";
import { buildIslandState } from "./islandState";

interface OpenIsland { placement: IslandPlacement; handle: IslandWindowHandle; }

function sameContent(left: IslandContent | null, right: IslandContent): boolean {
  return !!left && JSON.stringify(left) === JSON.stringify(right);
}

function samePlacement(left: IslandPlacement, right: IslandPlacement): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Shows an island on every notched display while threads or terminal agents are active (or always, when the user
 * keeps it showing), and removes it when the work ends, the setting turns off or the display goes away. Windows
 * exist only while the island shows.
 */
export function createIslandRuntime(deps: IslandRuntimeDeps): IslandRuntime {
  const windows = new Map<number, OpenIsland>();
  let content: IslandContent | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopWatchingDisplays: (() => void) | null = null;
  let demoTimer: ReturnType<typeof setTimeout> | null = null;
  let demoScenario: IslandDemoScenario = "running";
  let disposed = false;

  const view = (placement: IslandPlacement, current: IslandContent): IslandView => ({ geometry: placement.geometry, ...current });

  const closeAll = (): void => {
    for (const { handle } of windows.values()) handle.destroy();
    windows.clear();
    stopWatchingDisplays?.();
    stopWatchingDisplays = null;
  };

  /** What the island should show now, or null when it should not show at all. */
  const readContent = (): IslandContent | null => {
    if (disposed || !deps.supported) return null;
    const settings = deps.settings();
    // A demo previews the user's chosen size even with the island turned off.
    if (demoTimer) return { state: buildIslandState(islandDemoWork(demoScenario)), size: settings.size };
    if (!settings.enabled) return null;
    let state;
    try {
      state = buildIslandState(deps.countActiveWork());
    } catch (error) {
      deps.log("The notch island could not read active work", error);
      return null;
    }
    return state.counts.total > 0 || settings.alwaysShow ? { state, size: settings.size } : null;
  };

  /** Matches the open windows to the notched displays, sending the view to new, moved or (when asked) all windows. */
  const reconcile = (current: IslandContent, resendAll: boolean): void => {
    const placements = islandPlacements(deps.screen.getAllDisplays());
    const displayIds = new Set(placements.map((placement) => placement.displayId));
    for (const [displayId, open] of windows) {
      if (displayIds.has(displayId)) continue;
      open.handle.destroy();
      windows.delete(displayId);
    }
    for (const placement of placements) {
      const open = windows.get(placement.displayId);
      if (!open) {
        try {
          const handle = deps.createWindow(placement);
          windows.set(placement.displayId, { placement, handle });
          handle.showView(view(placement, current));
        } catch (error) {
          deps.log("The notch island window could not be created", error);
        }
        continue;
      }
      const moved = !samePlacement(open.placement, placement);
      if (moved) { open.handle.setBounds(placement.bounds); open.placement = placement; }
      if (moved || resendAll) open.handle.showView(view(placement, current));
    }
  };

  const sync = (): void => {
    timer = null;
    const next = readContent();
    if (!next) {
      content = null;
      closeAll();
      return;
    }
    const changed = !sameContent(content, next);
    content = next;
    stopWatchingDisplays ??= deps.screen.onDisplaysChanged(() => { if (content) reconcile(content, false); });
    reconcile(next, changed);
  };

  const schedule = (): void => {
    if (disposed || timer) return;
    timer = setTimeout(sync, deps.refreshDelayMs);
  };

  const findWindow = (webContentsId: number): OpenIsland | null => {
    for (const open of windows.values()) if (open.handle.webContentsId === webContentsId) return open;
    return null;
  };

  const stopWatchingWork = deps.supported ? deps.watchWork(schedule) : () => undefined;
  schedule();

  const syncNow = (): void => {
    if (timer) clearTimeout(timer);
    sync();
  };

  return {
    settingsChanged: syncNow,
    ownsSender: (webContentsId) => findWindow(webContentsId) !== null,
    setInteractive: (webContentsId, interactive) => findWindow(webContentsId)?.handle.setInteractive(interactive),
    // Demo rows stand for no real thread, so they open Nora itself.
    open: (target) => { if (demoTimer) deps.openNora(); else deps.open(target); },
    openInbox: () => deps.openInbox(),
    openNora: () => deps.openNora(),
    startDemo(scenario) {
      if (!deps.supported) return "unsupported";
      if (islandPlacements(deps.screen.getAllDisplays()).length === 0) return "no-notch";
      if (demoTimer) clearTimeout(demoTimer);
      demoScenario = scenario;
      demoTimer = setTimeout(() => { demoTimer = null; syncNow(); }, deps.demoDurationMs);
      syncNow();
      return "shown";
    },
    stopDemo() {
      if (!demoTimer) return;
      clearTimeout(demoTimer);
      demoTimer = null;
      syncNow();
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (demoTimer) clearTimeout(demoTimer);
      timer = null;
      demoTimer = null;
      stopWatchingWork();
      closeAll();
    }
  };
}
