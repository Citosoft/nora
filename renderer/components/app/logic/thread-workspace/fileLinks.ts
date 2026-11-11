import { resolveWorkspaceMarkdownLinkTarget } from "@/components/app/logic/markdownLinkTargets";

/** Chat paths are relative to the checkout, rather than a Markdown document. */
export function resolveThreadFileLink(rootPath: string, href: string): string | null {
  let path = href.trim();
  if (!path || path.startsWith("#") || path.startsWith("//")) return null;
  if (/^file:/i.test(path)) {
    try {
      const url = new URL(path);
      if (url.hostname && url.hostname !== "localhost") return null;
      path = url.pathname;
    } catch {
      return null;
    }
  } else if (/^[a-z][a-z\d+.-]*:/i.test(path) && !/^[a-z]:[\\/]/i.test(path)) {
    return null;
  }
  path = path.split(/[?#]/u, 1)[0] ?? "";
  try {
    path = decodeURIComponent(path).replace(/\\/gu, "/").replace(/:\d+(?::\d+)?$/u, "");
  } catch {
    return null;
  }
  const root = rootPath.replace(/\\/gu, "/").replace(/\/+$/u, "");
  if (path.startsWith("/") || /^[a-z]:\//i.test(path)) {
    if (!path.startsWith(`${root}/`)) return null;
    path = path.slice(root.length + 1);
  }
  return resolveWorkspaceMarkdownLinkTarget("", path);
}
