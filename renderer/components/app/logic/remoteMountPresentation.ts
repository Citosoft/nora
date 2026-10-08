import type { ActiveRemoteMount } from "@shared/appTypes";

/** Short badge for a mount: the last segment of its local mount point, or "Ssh" when it has none. */
export const formatRemoteMountBadgeLabel = (localMount: string | null): string => {
  if (!localMount) {
    return "Ssh";
  }

  const normalizedPath = localMount.replace(/[\\\/]+$/, "");
  const segments = normalizedPath.split(/[\\\/]+/).filter(Boolean);
  return segments.at(-1) || normalizedPath;
};

export const formatRemoteMountTarget = (mount: ActiveRemoteMount): string =>
  `${mount.user ? `${mount.user}@` : ""}${mount.host || mount.remote}`;
