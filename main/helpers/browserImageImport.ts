import type { ImportBrowserImagePayload } from "@shared/appTypes";
import path from "node:path";

export function sanitizeImportedFileName(value: string): string {
  const trimmed = value.trim().replace(/[\\/:*?"<>|]+/g, "-");
  const normalized = path.posix.basename(trimmed).replace(/^\.+/, "");
  return normalized || "dropped-image";
}

export function getImportedImageExtension(contentType: string | null, sourceUrl: string, suggestedFileName?: string): string {
  const explicitName = suggestedFileName?.trim();
  if (explicitName) {
    const explicitExtension = path.posix.extname(explicitName);
    if (explicitExtension) {
      return explicitExtension.toLowerCase();
    }
  }

  try {
    const urlPath = new URL(sourceUrl).pathname;
    const urlExtension = path.posix.extname(urlPath);
    if (urlExtension) {
      return urlExtension.toLowerCase();
    }
  } catch {
    // Ignore invalid URL parsing here and fall back to MIME type.
  }

  switch ((contentType || "").split(";")[0].trim().toLowerCase()) {
    case "image/jpeg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    case "image/bmp":
      return ".bmp";
    case "image/avif":
      return ".avif";
    default:
      return ".png";
  }
}

export function getImportedImageTargetPath(payload: ImportBrowserImagePayload, contentType: string | null, sourceUrl?: string): string {
  const extension = getImportedImageExtension(contentType, sourceUrl || payload.sourceUrl || "", payload.suggestedFileName);
  const rawFileName = payload.suggestedFileName?.trim() || `image-${Date.now()}${extension}`;
  const fileName = path.posix.extname(rawFileName) ? sanitizeImportedFileName(rawFileName) : sanitizeImportedFileName(`${rawFileName}${extension}`);
  const normalizedDirectoryPath = payload.directoryPath.trim().replace(/^\/+|\/+$/g, "");
  return normalizedDirectoryPath ? `${normalizedDirectoryPath}/${fileName}` : fileName;
}
