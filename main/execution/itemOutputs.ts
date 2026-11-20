import fs from "node:fs/promises";
import path from "node:path";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { OutputFileContent, OutputFileSize } from "@shared/types/conversation/queries.types";
import { OUTPUT_FILE_TEXT_MAX_BYTES } from "@shared/conversations/gateway";
import { resolveWorkspaceFileViewKind } from "@shared/workspaceFileViewKind";
import { readImagePreview } from "@main/helpers/imagePreview";

/** Thumbnails fill a grid tile on high-density displays; previews are readable full-width. Both stay small enough for IPC. */
const IMAGE_SIZES: Record<OutputFileSize, { maxEdge: number; maxBytes: number; quality: number }> = {
  thumbnail: { maxEdge: 384, maxBytes: 50 * 1024 * 1024, quality: 72 },
  preview: { maxEdge: 1600, maxBytes: 50 * 1024 * 1024, quality: 82 }
};

/**
 * The output file a caller asked for, as an absolute path, or null. Callers name a path, but only one the item
 * itself recorded can be read or opened: an absolute file a tool call stored, or a file a reviewed turn added or
 * modified, relative to the thread's checkout and never outside it.
 */
export function itemOutputFile(item: TimelineItem | null, requested: string, checkoutPath: string): string | null {
  if (item?.kind === "tool") {
    return path.isAbsolute(requested) && item.details?.outputFiles?.some((file) => file.path === requested) ? requested : null;
  }
  if (item?.kind !== "review" || item.result.status !== "ready" || item.result.scope !== "turn" || !path.isAbsolute(checkoutPath)) return null;
  if (!item.result.changes.some((change) => change.path === requested && change.kind !== "deleted")) return null;
  const resolved = path.resolve(checkoutPath, requested);
  const relative = path.relative(checkoutPath, resolved);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? resolved : null;
}

/** Text the viewer can show: small enough, and with no NUL bytes that would mark it as binary. */
async function readOutputText(filePath: string): Promise<OutputFileContent> {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size > OUTPUT_FILE_TEXT_MAX_BYTES) return { kind: "unsupported" };
  const data = await fs.readFile(filePath);
  return data.includes(0) ? { kind: "unsupported" } : { kind: "text", text: data.toString("utf8") };
}

/**
 * Reads one of an item's output files for display: images as bounded previews at the requested size (never their
 * original bytes), and, at preview size, small text files as text. Anything else is `unsupported`; null when the
 * file is not an output of the item or cannot be read.
 */
export async function readItemOutputFile(item: TimelineItem | null, requested: string, checkoutPath: string, size: OutputFileSize): Promise<OutputFileContent | null> {
  const filePath = itemOutputFile(item, requested, checkoutPath);
  if (!filePath) return null;
  switch (resolveWorkspaceFileViewKind(filePath)) {
    case "image": { const preview = await readImagePreview(filePath, IMAGE_SIZES[size]); return preview ? { kind: "image", preview } : null; }
    case "external": return { kind: "unsupported" };
    case "text":
      if (size === "thumbnail") return { kind: "unsupported" };
      try { return await readOutputText(filePath); } catch { return null; }
  }
}
