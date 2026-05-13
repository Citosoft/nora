const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg"
]);

function normalizeWorkspaceLinkPath(pathName: string): string | null {
  const segments = pathName.replace(/\\/g, "/").split("/");
  const normalized: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      if (normalized.length === 0) {
        return null;
      }
      normalized.pop();
      continue;
    }

    normalized.push(segment);
  }

  return normalized.join("/");
}

function splitWorkspacePath(pathName: string): string[] | null {
  const normalized = normalizeWorkspaceLinkPath(pathName);
  if (!normalized) {
    return null;
  }
  return normalized.split("/").filter(Boolean);
}

export function resolveWorkspaceMarkdownLinkTarget(currentPath: string, href: string): string | null {
  const trimmedHref = href.trim();
  if (!trimmedHref || trimmedHref.startsWith("#")) {
    return null;
  }

  if (trimmedHref.startsWith("//") || /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedHref)) {
    return null;
  }

  const pathWithoutHash = trimmedHref.split("#", 1)[0] ?? "";
  const pathWithoutQuery = pathWithoutHash.split("?", 1)[0] ?? "";
  if (!pathWithoutQuery) {
    return null;
  }

  const normalizedCurrentPath = currentPath.replace(/\\/g, "/");
  const currentDirectory = normalizedCurrentPath.includes("/")
    ? normalizedCurrentPath.slice(0, normalizedCurrentPath.lastIndexOf("/"))
    : "";
  const rawTarget = pathWithoutQuery.startsWith("/")
    ? pathWithoutQuery.slice(1)
    : (currentDirectory ? `${currentDirectory}/${pathWithoutQuery}` : pathWithoutQuery);

  return normalizeWorkspaceLinkPath(rawTarget);
}

export function resolveWorkspaceMarkdownLinkHref(currentPath: string, targetPath: string): string | null {
  const currentSegments = splitWorkspacePath(currentPath);
  const targetSegments = splitWorkspacePath(targetPath);
  if (!currentSegments || !targetSegments || targetSegments.length === 0) {
    return null;
  }

  const currentDirectorySegments = currentSegments.slice(0, -1);
  let sharedSegmentCount = 0;
  const maxSharedSegments = Math.min(currentDirectorySegments.length, targetSegments.length);
  while (
    sharedSegmentCount < maxSharedSegments &&
    currentDirectorySegments[sharedSegmentCount] === targetSegments[sharedSegmentCount]
  ) {
    sharedSegmentCount += 1;
  }

  const upwardSegments = Array.from(
    { length: currentDirectorySegments.length - sharedSegmentCount },
    () => ".."
  );
  const downwardSegments = targetSegments.slice(sharedSegmentCount);
  const relativePath = [...upwardSegments, ...downwardSegments].join("/");
  if (!relativePath) {
    return targetSegments[targetSegments.length - 1] ?? null;
  }

  return /[\\/]$/.test(targetPath.trim()) ? `${relativePath}/` : relativePath;
}

export function buildWorkspaceMarkdownLink(currentPath: string, targetPath: string): string | null {
  const href = resolveWorkspaceMarkdownLinkHref(currentPath, targetPath);
  const targetSegments = splitWorkspacePath(targetPath);
  if (!targetSegments || targetSegments.length === 0) {
    return null;
  }

  const label = targetSegments[targetSegments.length - 1] ?? null;
  if (!href || !label) {
    return null;
  }

  const wrappedHref = /[\s<>]/.test(href) ? `<${href}>` : href;
  return `[${label}](${wrappedHref})`;
}

export function isWorkspaceImageLinkTarget(pathName: string): boolean {
  const extension = pathName.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
}
