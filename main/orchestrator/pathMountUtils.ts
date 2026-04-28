import type { ActiveRemoteMount } from "@shared/appTypes";
import { isPathWithinComparableRoot, normalizeComparablePath } from "@shared/pathComparison";
import path from "node:path";
import { isWindows } from "./shell";

export const normalizeWindowsPath = (value: string): string =>
  normalizeComparablePath(path.resolve(value), { windows: true });

export const findRemoteMountForPath = (projectPath: string, mounts: ActiveRemoteMount[]): ActiveRemoteMount | null => {
  const normalizedProjectPath = normalizeWindowsPath(projectPath);
  return (
    mounts
      .filter((mount) => mount.localMount)
      .sort((left, right) => (right.localMount?.length || 0) - (left.localMount?.length || 0))
      .find((mount) => {
        const normalizedMount = normalizeWindowsPath(mount.localMount!);
        return normalizedProjectPath === normalizedMount || normalizedProjectPath.startsWith(`${normalizedMount}\\`);
      }) || null
  );
};

export const pathIsWithinMount = (projectPath: string, mountPoint: string): boolean =>
  isPathWithinComparableRoot(path.resolve(projectPath), path.resolve(mountPoint), { windows: true });

export const pathIsWithinAnyMount = (projectPath: string, mountPoints: string[]): boolean =>
  mountPoints.some((mountPoint) => pathIsWithinMount(projectPath, mountPoint));

export const isWindowsUncPath = (value: string): boolean => isWindows() && value.startsWith("\\\\");
