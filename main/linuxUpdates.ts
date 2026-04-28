import { APP_SHORT_NAME } from "@shared/appMeta";
import type { LinuxUpdateStatus, ReleaseVersionStatus } from "@shared/appTypes";
import { app } from "electron";
import type { GithubReleaseResponse, ParsedVersion } from "./types/internal.types";
import { getLatestPublicReleaseApiUrl, getLatestPublicReleaseUrl, getPublicReleaseUrl } from "./updateRepository";

const LINUX_APT_UPDATE_COMMAND = "sudo apt update && sudo apt upgrade nora";

function parseVersion(value: string): ParsedVersion | null {
  const normalized = value.trim().replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) {
    return null;
  }

  const [, major, minor, patch] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch)
  };
}

function compareParsedVersions(left: ParsedVersion, right: ParsedVersion): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

function normalizeReleaseVersion(tagName: string): string {
  return tagName.trim().replace(/^v/i, "");
}

function getCurrentVersion(): string {
  return app.getVersion();
}

function getDefaultReleaseUrl(tagName: string): string {
  return getPublicReleaseUrl(tagName);
}

function extractTagNameFromReleaseUrl(releaseUrl: string): string | null {
  const tagMatch = releaseUrl.match(/\/releases\/tag\/([^/?#]+)$/i);
  return tagMatch?.[1] || null;
}

async function fetchLatestReleaseFromPublicPage(currentVersion: string): Promise<ReleaseVersionStatus> {
  const latestReleaseUrl = getLatestPublicReleaseUrl();
  const response = await fetch(latestReleaseUrl, {
    headers: {
      "User-Agent": `${APP_SHORT_NAME}/${currentVersion}`
    },
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    return {
      kind: "error",
      currentVersion,
      message: `Unable to check the latest release (${response.status}).`,
      releaseUrl: getDefaultReleaseUrl(`v${currentVersion}`)
    };
  }

  const resolvedReleaseUrl = response.url || latestReleaseUrl;
  const tagName = extractTagNameFromReleaseUrl(resolvedReleaseUrl);
  if (!tagName) {
    return {
      kind: "error",
      currentVersion,
      message: "Unable to determine the latest release tag.",
      releaseUrl: resolvedReleaseUrl
    };
  }

  const latestVersion = normalizeReleaseVersion(tagName);
  const currentParsedVersion = parseVersion(currentVersion);
  const latestParsedVersion = parseVersion(latestVersion);
  const isUpdateAvailable = currentParsedVersion && latestParsedVersion
    ? compareParsedVersions(currentParsedVersion, latestParsedVersion) < 0
    : currentVersion !== latestVersion;

  if (!isUpdateAvailable) {
    return {
      kind: "up-to-date",
      currentVersion,
      latestVersion,
      releaseUrl: resolvedReleaseUrl
    };
  }

  return {
    kind: "available",
    currentVersion,
    latestVersion,
    releaseUrl: resolvedReleaseUrl
  };
}

export async function getReleaseVersionStatus(): Promise<ReleaseVersionStatus> {
  const currentVersion = getCurrentVersion();

  try {
    const response = await fetch(getLatestPublicReleaseApiUrl(), {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `${APP_SHORT_NAME}/${currentVersion}`
      },
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      return fetchLatestReleaseFromPublicPage(currentVersion);
    }

    const payload = (await response.json()) as GithubReleaseResponse;
    const tagName = typeof payload.tag_name === "string" ? payload.tag_name : null;
    const releaseUrl = typeof payload.html_url === "string" && payload.html_url.length > 0
      ? payload.html_url
      : (tagName ? getDefaultReleaseUrl(tagName) : getDefaultReleaseUrl(`v${currentVersion}`));

    if (!tagName) {
      return {
        kind: "error",
        currentVersion,
        message: "The latest GitHub release did not include a tag name.",
        releaseUrl
      };
    }

    const latestVersion = normalizeReleaseVersion(tagName);
    const currentParsedVersion = parseVersion(currentVersion);
    const latestParsedVersion = parseVersion(latestVersion);
    const isUpdateAvailable = currentParsedVersion && latestParsedVersion
      ? compareParsedVersions(currentParsedVersion, latestParsedVersion) < 0
      : currentVersion !== latestVersion;

    if (!isUpdateAvailable) {
      return {
        kind: "up-to-date",
        currentVersion,
        latestVersion,
        releaseUrl
      };
    }

    return {
      kind: "available",
      currentVersion,
      latestVersion,
      releaseUrl
    };
  } catch (error) {
    return {
      kind: "error",
      currentVersion,
      message: error instanceof Error ? error.message : "Unable to check the latest release.",
      releaseUrl: getDefaultReleaseUrl(`v${currentVersion}`)
    };
  }
}

export async function getLinuxUpdateStatus(): Promise<LinuxUpdateStatus> {
  const currentVersion = getCurrentVersion();

  if (process.platform !== "linux") {
    return {
      kind: "unsupported",
      currentVersion,
      updateCommand: LINUX_APT_UPDATE_COMMAND,
      reason: "Linux package-manager updates are only relevant on Linux."
    };
  }

  if (!app.isPackaged) {
    return {
      kind: "unsupported",
      currentVersion,
      updateCommand: LINUX_APT_UPDATE_COMMAND,
      reason: "Linux update notices are only enabled in packaged builds."
    };
  }

  const releaseStatus = await getReleaseVersionStatus();
  if (releaseStatus.kind === "error") {
    return {
      kind: "error",
      currentVersion: releaseStatus.currentVersion,
      updateCommand: LINUX_APT_UPDATE_COMMAND,
      message: releaseStatus.message,
      releaseUrl: releaseStatus.releaseUrl
    };
  }

  return {
    ...releaseStatus,
    updateCommand: LINUX_APT_UPDATE_COMMAND
  };
}
