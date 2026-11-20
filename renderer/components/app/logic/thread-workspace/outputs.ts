import type { TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";
import { resolveWorkspaceFileViewKind } from "@shared/workspaceFileViewKind";
import { getWorkspaceFileIconKind } from "@/lib/workspaceFileIconKind";
import type { ThreadOutput, ThreadOutputKind } from "@/components/app/types/threadOutputs.types";

/** Non-code files only: code, text and config edits already show as reviewed changes. */
export function threadOutputKind(path: string): ThreadOutputKind | null {
  const iconKind = getWorkspaceFileIconKind(path);
  switch (iconKind) {
    case "image": case "video": case "audio": case "sheet": case "archive": return iconKind;
  }
  return resolveWorkspaceFileViewKind(path) === "external" ? "document" : null;
}

export function outputFileName(path: string): string {
  return path.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? path;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

/** A path inside the checkout, relative to it; null for files elsewhere on the host. */
export function checkoutRelativePath(rootPath: string, absolutePath: string): string | null {
  const root = normalizePath(rootPath);
  const file = normalizePath(absolutePath);
  return root && file.startsWith(`${root}/`) ? file.slice(root.length + 1) : null;
}

/** A tool's output images, for its preview entry in the thread. */
export function toolOutputImages(tool: ToolActivity): string[] {
  return (tool.details?.outputFiles ?? []).map((file) => file.path).filter((path) => threadOutputKind(path) === "image");
}

/**
 * Collects the thread's non-code outputs, newest first, one row per file. Files come from tool calls that wrote or
 * delivered them, and from turn reviews (observed evidence for this thread); each keeps its latest source, and a
 * file drops out once a later reviewed turn deletes it.
 */
export function collectThreadOutputs(items: readonly TimelineItem[], rootPath: string): ThreadOutput[] {
  const outputs = new Map<string, ThreadOutput>();
  const root = normalizePath(rootPath);
  const put = (key: string, output: ThreadOutput | null) => { outputs.delete(key); if (output) outputs.set(key, output); };
  for (const item of items) {
    if (item.kind === "tool" && item.details?.outputFiles) {
      const description = item.details.category === "image" ? item.details.input?.trim() || null : null;
      for (const { path } of item.details.outputFiles) {
        const kind = threadOutputKind(path);
        const key = normalizePath(path);
        if (kind) put(key, { source: "tool", key, kind, itemId: item.id, path, name: outputFileName(path), description, createdAt: item.createdAt });
      }
    } else if (item.kind === "review" && item.result.status === "ready" && item.result.scope === "turn") {
      for (const change of item.result.changes) {
        const key = root ? `${root}/${normalizePath(change.path)}` : normalizePath(change.path);
        const kind = change.kind === "deleted" ? null : threadOutputKind(change.path);
        put(key, kind ? { source: "workspace", key, kind, itemId: item.id, path: change.path, name: outputFileName(change.path), createdAt: item.createdAt } : null);
      }
    }
  }
  return [...outputs.values()].reverse();
}
