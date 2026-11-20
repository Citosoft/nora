import type { AboutUpdateSummary, AutoUpdateTestAction, RepositoryStarStatus } from "@/components/app/types/aboutDialog.types";
import type { ReleaseVersionStatus } from "@shared/appTypes";

export const AUTO_UPDATE_TEST_ACTIONS: readonly AutoUpdateTestAction[] = [
  { target: "available", label: "Update available" },
  { target: "checking", label: "Checking" },
  { target: "downloading", label: "Downloading" },
  { target: "downloaded", label: "Ready to install" },
  { target: "up-to-date", label: "Installed" },
  { target: "error", label: "Error" },
  { target: "idle", label: "Reset" }
];

export function summarizeAboutUpdateStatus(
  status: ReleaseVersionStatus | null,
  hasChecked: boolean,
  fallbackVersion: string
): AboutUpdateSummary {
  const installedVersion = status?.currentVersion || fallbackVersion;
  const pending: AboutUpdateSummary = {
    tone: "pending",
    label: "Checking for updates",
    installedVersion,
    latestVersion: null,
    detail: null,
    canUpdate: false
  };

  if (!hasChecked || status === null) {
    return pending;
  }

  switch (status.kind) {
    case "available":
      return {
        ...pending,
        tone: "available",
        label: "Update available",
        latestVersion: status.latestVersion,
        canUpdate: status.releaseUrl.trim().length > 0
      };
    case "up-to-date":
      return { ...pending, tone: "current", label: "Up to date", latestVersion: status.latestVersion };
    case "error":
      return { ...pending, tone: "error", label: "Update check failed", detail: status.message || null };
  }
}

export function formatRepositoryStarLabel(status: RepositoryStarStatus, isStarring: boolean): string {
  if (isStarring) {
    return "Starring…";
  }

  return status === "starred" ? "Starred" : "Star";
}

export function describeRepositoryStar(status: RepositoryStarStatus, starCount: number | null, appName: string): string {
  if (status === "unavailable") {
    return `Sign in to the GitHub CLI (gh) to star from ${appName}`;
  }
  if (starCount === null) {
    return "Show your support for the project";
  }

  const formatted = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(starCount);
  return `${formatted} ${starCount === 1 ? "star" : "stars"}`;
}

export function formatReleaseAssetSize(sizeBytes: number): string {
  return sizeBytes > 0 ? `${Math.max(1, Math.round(sizeBytes / 1024 / 1024))} MB` : "Unknown size";
}
