import type { ActiveRemoteMount, WorkspaceLocation } from "@shared/appTypes";
import { isPathWithinComparableRoot, normalizeComparablePath } from "@shared/pathComparison";
import path from "node:path";
import { readActiveRemoteMounts } from "../remoteMounts";
import type { WorkspaceTarget } from "../types/internal.types";
import { isWindows } from "./shell";

const getWorkspaceLocation = (target: WorkspaceTarget): WorkspaceLocation =>
  target.location || { kind: "local" };

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\"'\"'`)}'`;

const normalizeRemoteShellPath = (value: string): string =>
  value.startsWith("~/") ? `$HOME/${value.slice(2)}` : value;

export const normalizeLocalPath = (value: string): string =>
  normalizeComparablePath(path.resolve(value), { windows: isWindows() });

export const isPathWithinLocalRoot = (candidatePath: string, rootPath: string): boolean =>
  isPathWithinComparableRoot(path.resolve(candidatePath), path.resolve(rootPath), { windows: isWindows() });

const pickBestActiveMount = (projectRoot: string, activeMounts: ActiveRemoteMount[]): ActiveRemoteMount | null =>
  activeMounts
    .filter((mount) => mount.localMount && isPathWithinLocalRoot(projectRoot, mount.localMount))
    .sort((left, right) => (right.localMount?.length || 0) - (left.localMount?.length || 0))[0] || null;

export const mapMountedLocalPathToRemotePath = (projectRoot: string, mount: ActiveRemoteMount): string | null => {
  if (!mount.localMount || !mount.remotePath || !isPathWithinLocalRoot(projectRoot, mount.localMount)) {
    return null;
  }

  const normalizedLocalMount = normalizeLocalPath(mount.localMount);
  const normalizedProjectRoot = normalizeLocalPath(projectRoot);
  const relativeSuffix = normalizedProjectRoot.slice(normalizedLocalMount.length).replace(/^[\\/]+/, "");
  const remoteBasePath = mount.remotePath.replace(/\\/g, "/").replace(/[\\/]+$/, "") || "/";
  if (!relativeSuffix) {
    return remoteBasePath;
  }

  const remoteSuffix = relativeSuffix.split(path.sep).join("/");
  return path.posix.join(remoteBasePath, remoteSuffix);
};

export const mapGitArgumentToMountedRemotePath = (arg: string, mount: ActiveRemoteMount): string => {
  if (!path.isAbsolute(arg)) {
    return arg;
  }

  return mapMountedLocalPathToRemotePath(arg, mount) || arg;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const mapMountedRemoteTextToLocal = (value: string, mount: ActiveRemoteMount): string => {
  if (!mount.localMount || !mount.remotePath) {
    return value;
  }

  const normalizedRemote = mount.remotePath.replace(/\\/g, "/").replace(/[\\/]+$/, "");
  const normalizedLocal = mount.localMount.replace(/[\\/]+$/, "");
  if (!normalizedRemote) {
    return value;
  }

  const pattern = new RegExp(`${escapeRegExp(normalizedRemote)}(?=$|/)`, "g");
  return value.replace(pattern, normalizedLocal);
};

export const resolveMountedGitTarget = async (
  target: WorkspaceTarget
): Promise<{ mount: ActiveRemoteMount; remoteTarget: WorkspaceTarget } | null> => {
  const location = getWorkspaceLocation(target);
  if (location.kind !== "local") {
    return null;
  }

  const activeMounts = await readActiveRemoteMounts().catch(() => [] as ActiveRemoteMount[]);
  const mount = pickBestActiveMount(target.path, activeMounts);
  if (!mount?.host || !mount.remotePath) {
    return null;
  }

  const remotePath = mapMountedLocalPathToRemotePath(target.path, mount);
  if (!remotePath) {
    return null;
  }

  return {
    mount,
    remoteTarget: {
      path: remotePath,
      location: {
        kind: "ssh",
        host: mount.host,
        user: mount.user || "",
        port: mount.port ?? null,
        remotePath,
        alias: mount.alias || null
      }
    }
  };
};

export const buildGitCommand = (target: WorkspaceTarget, args: string[]): string => {
  const normalizedPath = normalizeRemoteShellPath(target.path);
  const renderedPath = normalizedPath.startsWith("$HOME/") ? normalizedPath : shellQuote(normalizedPath);
  const renderedArgs = args
    .map((arg) => {
      const normalizedArg = normalizeRemoteShellPath(arg);
      return normalizedArg.startsWith("$HOME/") ? normalizedArg : shellQuote(normalizedArg);
    })
    .join(" ");
  return `git -C ${renderedPath} ${renderedArgs}`;
};

export const getGitProgressCommand = async (target: WorkspaceTarget, args: string[]): Promise<string> => {
  const location = getWorkspaceLocation(target);
  if (location.kind === "ssh") {
    const destination = `${location.user}@${location.host}`;
    return `ssh ${destination}${location.port ? ` -p ${location.port}` : ""} ${buildGitCommand(target, args)}`;
  }

  const mountedTarget = await resolveMountedGitTarget(target);
  if (!mountedTarget) {
    return `git ${args.map((arg) => shellQuote(arg)).join(" ")}`;
  }

  const mountedLocation = mountedTarget.remoteTarget.location;
  if (!mountedLocation || mountedLocation.kind !== "ssh") {
    return `git ${args.map((arg) => shellQuote(arg)).join(" ")}`;
  }

  const destinationHost = mountedLocation.alias?.trim() || mountedLocation.host;
  const destination = mountedLocation.user
    ? `${mountedLocation.user}@${destinationHost}`
    : destinationHost;
  return `ssh ${destination}${mountedLocation.port ? ` -p ${mountedLocation.port}` : ""} ${buildGitCommand(
    mountedTarget.remoteTarget,
    args.map((arg) => mapGitArgumentToMountedRemotePath(arg, mountedTarget.mount))
  )}`;
};
