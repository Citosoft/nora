import type { AppDomainEvent, AppState, AppStateDelta } from "@shared/appTypes";
import type { BrowserWindow } from "electron";

interface StateBroadcastDeps {
  getMainWindow: () => BrowserWindow | null;
  compactStateForRenderer: (snapshot: AppState) => AppState;
  buildStateDelta: (previous: AppState | null, next: AppState) => AppStateDelta | null;
  deriveAppDomainEvents: (previous: AppState | null, next: AppState) => AppDomainEvent[];
  stateBroadcastIntervalMs: number;
}

export interface StateBroadcastController {
  notifyStateChanged: (snapshot: AppState) => void;
  notifyStateDelta: (delta: AppStateDelta) => void;
  scheduleStateChanged: (snapshot: AppState, options?: { preferDelta?: boolean }) => void;
  setLastBroadcastSnapshot: (snapshot: AppState | null) => void;
}

export function createStateBroadcastController({
  getMainWindow,
  compactStateForRenderer,
  buildStateDelta,
  deriveAppDomainEvents,
  stateBroadcastIntervalMs
}: StateBroadcastDeps): StateBroadcastController {
  let pendingStateSnapshot: AppState | null = null;
  let pendingStateBroadcastTimer: NodeJS.Timeout | null = null;
  let pendingStatePreferDelta = true;
  let lastBroadcastRawSnapshot: AppState | null = null;

  const notifyStateChanged = (snapshot: AppState): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("state:changed", compactStateForRenderer(snapshot));
  };

  const notifyStateDelta = (delta: AppStateDelta): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("state:delta", delta);
  };

  const notifyDomainEvents = (events: AppDomainEvent[]): void => {
    if (!events.length) {
      return;
    }

    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("state:domain-events", events);
  };

  const scheduleStateChanged = (snapshot: AppState, options?: { preferDelta?: boolean }): void => {
    pendingStateSnapshot = snapshot;
    pendingStatePreferDelta = options?.preferDelta ?? true;
    if (pendingStateBroadcastTimer) {
      return;
    }

    pendingStateBroadcastTimer = setTimeout(() => {
      pendingStateBroadcastTimer = null;
      if (pendingStateSnapshot) {
        const snapshotToSend = pendingStateSnapshot;
        const preferDelta = pendingStatePreferDelta;
        pendingStateSnapshot = null;
        pendingStatePreferDelta = true;

        const prevSnapshot = lastBroadcastRawSnapshot;
        const domainEvents = deriveAppDomainEvents(prevSnapshot, snapshotToSend);
        if (domainEvents.length) {
          notifyDomainEvents(domainEvents);
        }

        if (preferDelta) {
          const delta = buildStateDelta(prevSnapshot, snapshotToSend);
          if (delta) {
            notifyStateDelta(delta);
            lastBroadcastRawSnapshot = snapshotToSend;
            return;
          }
        }

        notifyStateChanged(snapshotToSend);
        lastBroadcastRawSnapshot = snapshotToSend;
      }
    }, stateBroadcastIntervalMs);
  };

  const setLastBroadcastSnapshot = (snapshot: AppState | null): void => {
    lastBroadcastRawSnapshot = snapshot;
  };

  return {
    notifyStateChanged,
    notifyStateDelta,
    scheduleStateChanged,
    setLastBroadcastSnapshot
  };
}
