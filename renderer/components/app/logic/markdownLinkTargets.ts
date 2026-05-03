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

export function isWorkspaceImageLinkTarget(pathName: string): boolean {
  const extension = pathName.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
}
