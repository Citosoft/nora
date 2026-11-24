import { useCallback, useEffect, useRef, useState } from "react";
import * as Updates from "expo-updates";
import type { AppUpdateController, AppUpdatePort, AppUpdateSnapshot, UpdateAction } from "@/types/appUpdate.types";
import { installAppUpdate, updateScreen } from "@/state/appUpdate";
import { installedApp } from "@/platform/installedApp";
import type { AppAboutInfo } from "@/types/appAbout.types";
import { subscribeToForeground } from "@/platform/foregroundSignals";

const port: AppUpdatePort = {
  async download() {
    const result = await Updates.fetchUpdateAsync();
    return result.isNew || result.isRollBackToEmbedded;
  },
  reload: () => Updates.reloadAsync()
};

/** Checks on launch and when returning to the app; Expo's own startup download is observed rather than duplicated. */
export function useAppUpdate(): AppUpdateController {
  const updates = Updates.useUpdates();
  const enabled = !__DEV__ && Updates.isEnabled;
  const [action, setAction] = useState<UpdateAction>({ kind: "idle" });
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const installing = useRef(false);
  const checking = useRef(false);
  const launchChecked = useRef(false);
  const mounted = useRef(true);
  const latest = useRef(updates);
  latest.current = updates;
  const update = updates.downloadedUpdate ?? updates.availableUpdate;
  const key = update ? update.updateId ?? `rollback:${update.createdAt.toISOString()}` : null;
  const snapshot: AppUpdateSnapshot = { enabled, key, available: updates.isUpdateAvailable, pending: updates.isUpdatePending,
    downloading: updates.isDownloading, progress: updates.downloadProgress };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const checkForUpdate = useCallback((manual: boolean): void => {
    if (!enabled) return;
    if (manual) setDismissedKey(null);
    const current = latest.current;
    if (checking.current || installing.current || current.isStartupProcedureRunning || current.isChecking || current.isDownloading || current.isUpdatePending) return;
    checking.current = true;
    // Expo records check errors in useUpdates so About can explain failures without blocking startup.
    void Updates.checkForUpdateAsync().catch(() => {}).finally(() => { checking.current = false; });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (!launchChecked.current && !updates.isStartupProcedureRunning && !updates.isChecking) {
      launchChecked.current = true;
      if (!updates.lastCheckForUpdateTimeSinceRestart) checkForUpdate(false);
    }
    return subscribeToForeground(() => checkForUpdate(false));
  }, [checkForUpdate, enabled, updates.isStartupProcedureRunning, updates.isChecking, updates.lastCheckForUpdateTimeSinceRestart]);

  const install = (): void => {
    if (installing.current || updates.isDownloading || !enabled || !key) return;
    installing.current = true;
    void installAppUpdate(port, updates.isUpdatePending, (state) => { if (mounted.current) setAction(state); })
      .finally(() => { installing.current = false; });
  };
  const dismiss = (): void => {
    if (installing.current) return;
    setDismissedKey(key);
    setAction({ kind: "idle" });
  };
  const info: AppAboutInfo = { ...installedApp, kind: "native", source: __DEV__ ? "development"
    : updates.currentlyRunning.isEmergencyLaunch ? "recovery" : (!enabled || updates.currentlyRunning.isEmbeddedLaunch) ? "embedded" : "ota",
    updatesEnabled: enabled, channel: updates.currentlyRunning.channel ?? null, runtimeVersion: updates.currentlyRunning.runtimeVersion ?? null,
    updateId: updates.currentlyRunning.updateId ?? null, publishedAt: updates.currentlyRunning.createdAt ?? null,
    lastCheckedAt: updates.lastCheckForUpdateTimeSinceRestart ?? null, checking: updates.isChecking || updates.isStartupProcedureRunning,
    downloading: updates.isDownloading, available: updates.isUpdateAvailable, pending: updates.isUpdatePending,
    nextUpdateId: updates.isUpdateAvailable || updates.isUpdatePending ? update?.updateId ?? null : null, checkFailed: !!updates.checkError, downloadFailed: !!updates.downloadError };
  return { screen: updateScreen(snapshot, action, dismissedKey), install, dismiss, status: { info, check: () => checkForUpdate(true) } };
}
