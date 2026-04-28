import path from "node:path";

export function resolveMacAppBundlePath(executablePath: string): string | null {
  const normalizedPath = executablePath.toLowerCase();
  const appSegmentIndex = normalizedPath.indexOf(".app/");
  if (appSegmentIndex === -1) {
    return normalizedPath.endsWith(".app") ? executablePath : null;
  }

  return executablePath.slice(0, appSegmentIndex + 4);
}

export function resolveIdeIconSourcePath(
  executablePath: string,
  platform: NodeJS.Platform = process.platform
): string {
  if (platform !== "darwin") {
    return executablePath;
  }

  return resolveMacAppBundlePath(executablePath) ?? executablePath;
}

export function getMacAppBundleBaseName(candidatePath: string): string | null {
  const bundlePath = resolveMacAppBundlePath(candidatePath);
  if (!bundlePath) {
    return null;
  }

  return path.basename(bundlePath);
}

export function buildMacAppBundleSearchPaths(
  bundleBaseNames: string[],
  homeDirectory: string
): string[] {
  const roots = ["/Applications", path.posix.join(homeDirectory, "Applications")];
  const normalizedBaseNames = Array.from(new Set(
    bundleBaseNames
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => value.toLowerCase().endsWith(".app") ? value : `${value}.app`)
  ));

  const candidates: string[] = [];
  for (const root of roots) {
    for (const baseName of normalizedBaseNames) {
      candidates.push(path.posix.join(root, baseName));
    }
  }

  return candidates;
}
