export function isAbsoluteFilesystemPath(pathValue: string): boolean {
  const t = pathValue.trim();
  if (t.startsWith("/")) {
    return true;
  }
  if (/^[A-Za-z]:[\\/]/.test(t)) {
    return true;
  }
  if (t.startsWith("\\\\")) {
    return true;
  }
  return false;
}

export function tryStripWorkspaceRootPrefix(absolutePath: string, workspaceRoot: string): string | null {
  const abs = absolutePath.trim();
  const root = workspaceRoot.trim().replace(/[/\\]+$/, "");
  if (!abs || !root) {
    return null;
  }

  const isWin = /^[A-Za-z]:/.test(root) || root.startsWith("\\\\");
  const normalize = (value: string): string => {
    if (isWin) {
      return value.replace(/\//g, "\\").replace(/\\+/g, "\\").toLowerCase();
    }
    return value.replace(/\\/g, "/").replace(/\/+/g, "/");
  };

  const absNorm = normalize(abs);
  const rootNorm = normalize(root);
  const sep = isWin ? "\\" : "/";
  const rootWithSep = rootNorm.endsWith(sep) ? rootNorm : `${rootNorm}${sep}`;

  if (absNorm === rootNorm) {
    return "";
  }
  if (!absNorm.startsWith(rootWithSep)) {
    return null;
  }

  const suffix = absNorm.slice(rootWithSep.length);
  if (!suffix) {
    return "";
  }
  return suffix.split(/[/\\]/g).filter(Boolean).join("/");
}

export function toStoredPathForWorkspaceAttachment(
  absolutePath: string,
  kind: "file" | "directory",
  workspaceRoot: string | null
): string {
  const trimmedAbs = absolutePath.trim();
  const root = workspaceRoot?.trim() ?? "";
  if (!root) {
    return trimmedAbs;
  }
  const relative = tryStripWorkspaceRootPrefix(trimmedAbs, root);
  if (relative === null) {
    return trimmedAbs;
  }
  if (relative === "") {
    return "";
  }
  if (kind === "directory") {
    return relative.endsWith("/") ? relative : `${relative}/`;
  }
  return relative;
}

export function joinWorkspaceRootAndRelative(workspaceRoot: string, relativeWorkspacePath: string): string {
  const trimmedRoot = workspaceRoot.trim().replace(/[/\\]+$/, "");
  const trimmedRel = relativeWorkspacePath.trim();
  if (!trimmedRoot) {
    return trimmedRel;
  }

  const directoryTrailing =
    trimmedRel.endsWith("/") || (trimmedRel.length > 1 && trimmedRel.endsWith("\\"));
  const core = directoryTrailing ? trimmedRel.replace(/[/\\]+$/, "") : trimmedRel;
  const coreNoLead = core.replace(/^[/\\]+/, "");
  const segments = coreNoLead.split(/[/\\]+/).filter(Boolean);

  const isWindowsRoot =
    /^[A-Za-z]:/.test(trimmedRoot) ||
    trimmedRoot.startsWith("\\\\");
  const sep = isWindowsRoot ? "\\" : "/";

  if (segments.length === 0) {
    return directoryTrailing ? `${trimmedRoot}${sep}` : trimmedRoot;
  }

  const relJoined = segments.join(sep);
  const absolute = `${trimmedRoot}${sep}${relJoined}`;
  if (directoryTrailing && !absolute.endsWith(sep)) {
    return `${absolute}${sep}`;
  }
  return absolute;
}
