import type { ParsedVersion } from "@main/types/internal.types";

/** Parses a bare `major.minor.patch` version (optional `v` prefix and prerelease/build suffix). */
export function parseVersion(value: string): ParsedVersion | null {
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

export function compareParsedVersions(left: ParsedVersion, right: ParsedVersion): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

/** Finds the first `major.minor.patch` token in free-form CLI output such as `codex-cli 0.45.0`. */
export function findVersionInText(text: string): string | null {
  return text.match(/\d+\.\d+\.\d+/)?.[0] ?? null;
}

/** True when `latest` is a strictly newer release than `installed`; unparseable versions never report an update. */
export function isNewerVersion(installed: string, latest: string): boolean {
  const installedParsed = parseVersion(installed);
  const latestParsed = parseVersion(latest);
  return installedParsed !== null && latestParsed !== null && compareParsedVersions(installedParsed, latestParsed) < 0;
}
