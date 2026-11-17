import type { AppShutdown } from "@main/types/appShutdown.types";
import type { AutoUpdateStatus, AutoUpdateTestSupport, AutoUpdateTestTarget } from "@shared/appTypes";
import { app, autoUpdater } from "electron";
import { createAppUpdateConsent } from "./helpers/appUpdateConsent";
import { getReleaseVersionStatus } from "./linuxUpdates";
import { PUBLIC_RELEASE_REPOSITORY } from "./updateRepository";

const AUTO_UPDATE_PLATFORMS = new Set<NodeJS.Platform>(["win32", "darwin"]);
const autoUpdateListeners = new Set<(status: AutoUpdateStatus) => void>();

let autoUpdateStatus: AutoUpdateStatus = {
  kind: "unsupported",
  currentVersion: app.getVersion(),
  reason: "Automatic updates are only enabled for packaged Windows and macOS builds."
};
let autoUpdateSimulationEnabled = false;
let releaseCheckTimer: NodeJS.Timeout | null = null;
let installSimulationTimer: NodeJS.Timeout | null = null;

const autoUpdateLogger = {
  log(message: string): void {
    console.log(`[auto-update] ${message}`);
  },
  info(message: string): void {
    console.info(`[auto-update] ${message}`);
  },
  warn(message: string): void {
    console.warn(`[auto-update] ${message}`);
  },
  error(message: string): void {
    console.error(`[auto-update] ${message}`);
  }
};

function isAutoUpdateSupported(): boolean {
  return app.isPackaged && AUTO_UPDATE_PLATFORMS.has(process.platform);
}

function isAutoUpdateTestingEnabled(): boolean {
  return !app.isPackaged || process.env.NORA_ENABLE_AUTO_UPDATE_TESTING === "1";
}

function isAutoUpdateRuntimeEnabled(): boolean {
  return isAutoUpdateSupported() || isAutoUpdateTestingEnabled();
}

function notifyAutoUpdateListeners(): void {
  for (const listener of autoUpdateListeners) {
    listener(autoUpdateStatus);
  }
}

function setAutoUpdateStatus(status: AutoUpdateStatus): void {
  autoUpdateStatus = status;
  notifyAutoUpdateListeners();
}

const updateConsent = createAppUpdateConsent({
  getStatus: () => autoUpdateStatus,
  setStatus: setAutoUpdateStatus,
  checkRelease: getReleaseVersionStatus,
  startDownload: () => {
    if (isSimulationActive()) return;
    if (!isAutoUpdateSupported()) throw new Error("App updates are unavailable in this build.");
    autoUpdater.checkForUpdates();
  }
});

export function downloadAppUpdate(): void {
  updateConsent.download();
}

function getLastKnownLatestVersion(): string | null {
  return autoUpdateStatus.kind === "unsupported" ? null : autoUpdateStatus.latestVersion ?? null;
}

function shouldPreserveDownloadedState(): boolean {
  return autoUpdateStatus.kind === "downloaded";
}

function shouldPreserveActiveDownload(): boolean {
  return autoUpdateStatus.kind === "downloading" || autoUpdateStatus.kind === "downloaded";
}

function clearInstallSimulationTimer(): void {
  if (!installSimulationTimer) {
    return;
  }

  clearTimeout(installSimulationTimer);
  installSimulationTimer = null;
}

function isSimulationActive(): boolean {
  return autoUpdateSimulationEnabled;
}

function normalizeLatestVersion(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/^v/i, "") : null;
}

function getSimulatedLatestVersion(): string {
  const currentVersion = app.getVersion().trim();
  const parts = currentVersion.split(".");
  const lastPart = parts.at(-1);

  if (!lastPart) {
    return `${currentVersion}-test`;
  }

  const lastNumber = Number.parseInt(lastPart, 10);
  if (Number.isNaN(lastNumber)) {
    return `${currentVersion}-test`;
  }

  parts[parts.length - 1] = String(lastNumber + 1);
  return parts.join(".");
}

function createSimulatedStatus(target: AutoUpdateTestTarget): AutoUpdateStatus {
  const currentVersion = app.getVersion();
  const latestVersion = getSimulatedLatestVersion();

  switch (target) {
    case "idle":
      return {
        kind: "idle",
        currentVersion,
        latestVersion: null
      };
    case "available":
      return {
        kind: "available", currentVersion, latestVersion,
        releaseNotes: "### Features\n\n- Preview what’s new before downloading an update.\n\n### Fixes\n\n- Keep app updates optional until you choose to download.",
        releaseUrl: `https://github.com/${PUBLIC_RELEASE_REPOSITORY}/releases/latest`
      };
    case "checking":
      return {
        kind: "checking",
        currentVersion,
        latestVersion
      };
    case "downloading":
      return {
        kind: "downloading",
        currentVersion,
        latestVersion,
        releaseNotes: "Simulated update download for local testing."
      };
    case "downloaded":
      return {
        kind: "downloaded",
        currentVersion,
        latestVersion,
        releaseNotes: "Simulated update ready to install for local testing."
      };
    case "up-to-date":
      return {
        kind: "up-to-date",
        currentVersion: latestVersion,
        latestVersion
      };
    case "error":
      return {
        kind: "error",
        currentVersion,
        latestVersion,
        message: "Simulated updater error for local testing."
      };
    default:
      throw new Error(`Unsupported auto update simulation target: ${target}`);
  }
}

export function getAutoUpdateStatus(): AutoUpdateStatus {
  if (!isAutoUpdateRuntimeEnabled()) {
    return {
      kind: "unsupported",
      currentVersion: app.getVersion(),
      reason: "Automatic updates are only enabled for packaged Windows and macOS builds."
    };
  }

  return autoUpdateStatus;
}

export function onAutoUpdateStatusChanged(listener: (status: AutoUpdateStatus) => void): () => void {
  autoUpdateListeners.add(listener);
  return () => {
    autoUpdateListeners.delete(listener);
  };
}

export function getAutoUpdateTestSupport(): AutoUpdateTestSupport {
  return {
    enabled: isAutoUpdateTestingEnabled()
  };
}

export function simulateAutoUpdateStatus(target: AutoUpdateTestTarget): AutoUpdateStatus {
  if (!isAutoUpdateTestingEnabled()) {
    throw new Error("Auto update simulation is only available in local testing mode.");
  }

  clearInstallSimulationTimer();
  autoUpdateSimulationEnabled = target !== "idle";
  const nextStatus = createSimulatedStatus(target);
  setAutoUpdateStatus(nextStatus);
  return nextStatus;
}

export function installDownloadedUpdate(requestQuit: AppShutdown["request"]): Promise<boolean> | void {
  if (autoUpdateStatus.kind !== "downloaded") {
    throw new Error("No downloaded update is ready to install.");
  }

  if (isSimulationActive()) {
    clearInstallSimulationTimer();
    const nextVersion = autoUpdateStatus.latestVersion ?? getSimulatedLatestVersion();
    setAutoUpdateStatus({
      kind: "installing",
      currentVersion: app.getVersion(),
      latestVersion: nextVersion
    });
    installSimulationTimer = setTimeout(() => {
      installSimulationTimer = null;
      setAutoUpdateStatus({
        kind: "up-to-date",
        currentVersion: nextVersion,
        latestVersion: nextVersion
      });
    }, 1200);
    return;
  }

  return requestQuit("update", () => autoUpdater.quitAndInstall());
}

export function initializeAutoUpdates(): void {
  if (!isAutoUpdateRuntimeEnabled()) {
    return;
  }

  try {
    autoUpdateSimulationEnabled = false;
    clearInstallSimulationTimer();
    setAutoUpdateStatus({
      kind: "idle",
      currentVersion: app.getVersion(),
      latestVersion: null
    });

    if (!isAutoUpdateSupported()) {
      return;
    }

    autoUpdater.on("checking-for-update", () => {
      if (isSimulationActive()) {
        return;
      }

      if (shouldPreserveActiveDownload()) {
        return;
      }

      setAutoUpdateStatus({
        kind: "checking",
        currentVersion: app.getVersion(),
        latestVersion: getLastKnownLatestVersion()
      });
    });

    autoUpdater.on("update-available", () => {
      if (isSimulationActive()) {
        return;
      }

      setAutoUpdateStatus({
        kind: "downloading",
        currentVersion: app.getVersion(),
        latestVersion: getLastKnownLatestVersion(),
        releaseNotes: "releaseNotes" in autoUpdateStatus ? autoUpdateStatus.releaseNotes ?? null : null,
        releaseUrl: "releaseUrl" in autoUpdateStatus ? autoUpdateStatus.releaseUrl : undefined
      });
    });

    // `electron` typings narrow `autoUpdater.on` to a small event union; `download-progress` is emitted at runtime.
    const autoUpdaterForProgress = autoUpdater as unknown as {
      on(
        event: "download-progress",
        listener: (progress: { percent?: number; total?: number; transferred?: number }) => void
      ): typeof autoUpdater;
    };

    autoUpdaterForProgress.on("download-progress", (progress) => {
      if (isSimulationActive()) {
        return;
      }

      if (autoUpdateStatus.kind !== "downloading") {
        return;
      }

      const current = autoUpdateStatus;
      const raw = progress.percent;
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        return;
      }

      const downloadProgressPercent = Math.min(100, Math.max(0, Math.round(raw)));
      setAutoUpdateStatus({
        ...current,
        downloadProgressPercent
      });
    });

    autoUpdater.on("update-not-available", () => {
      if (isSimulationActive()) {
        return;
      }

      if (shouldPreserveActiveDownload()) {
        return;
      }

      setAutoUpdateStatus({
        kind: "up-to-date",
        currentVersion: app.getVersion(),
        latestVersion: app.getVersion()
      });
    });

    autoUpdater.on("update-downloaded", (_event, releaseNotes, releaseName) => {
      if (isSimulationActive()) {
        return;
      }

      setAutoUpdateStatus({
        kind: "downloaded",
        currentVersion: app.getVersion(),
        latestVersion: normalizeLatestVersion(releaseName) ?? getLastKnownLatestVersion(),
        releaseNotes: typeof releaseNotes === "string" && releaseNotes.trim()
          ? releaseNotes
          : ("releaseNotes" in autoUpdateStatus ? autoUpdateStatus.releaseNotes ?? null : null),
        releaseUrl: "releaseUrl" in autoUpdateStatus ? autoUpdateStatus.releaseUrl : undefined
      });
    });

    autoUpdater.on("error", (error) => {
      if (isSimulationActive()) {
        return;
      }

      if (shouldPreserveDownloadedState()) {
        autoUpdateLogger.error(
          `Ignoring updater error after download completed: ${error instanceof Error ? error.message : String(error)}`
        );
        return;
      }

      setAutoUpdateStatus({
        kind: "error",
        currentVersion: app.getVersion(),
        latestVersion: getLastKnownLatestVersion(),
        message: error instanceof Error ? error.message : String(error)
      });
    });

    const formatSegment = process.windowsStore ? "/msix" : "";
    autoUpdater.setFeedURL({
      url: `https://update.electronjs.org/${PUBLIC_RELEASE_REPOSITORY}/${process.platform}-${process.arch}${formatSegment}/${app.getVersion()}`
    });
    // Only metadata is polled. The native updater runs once per explicit download request.
    const check = (): void => {
      if (!isSimulationActive()) void updateConsent.check().catch(autoUpdateLogger.error);
    };
    if (releaseCheckTimer) clearInterval(releaseCheckTimer);
    check();
    releaseCheckTimer = setInterval(check, 30 * 60 * 1000);
    releaseCheckTimer.unref();
  } catch (error) {
    console.error("Failed to initialize auto updates.", error);
    setAutoUpdateStatus({
      kind: "error",
      currentVersion: app.getVersion(),
      latestVersion: null,
      message: error instanceof Error ? error.message : "Failed to initialize auto updates."
    });
  }
}
