import type { PastedImageReference, SavePastedImagePayload } from "@shared/types/agentInput.types";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PASTED_IMAGES_DIRECTORY = path.join(os.tmpdir(), "nora-pasted-images");
const PASTED_IMAGE_PLACEHOLDER = "[pasted image]";
const PASTED_IMAGE_RETENTION_MS = 1000 * 60 * 60 * 24;

function getImageExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/bmp":
      return "bmp";
    default:
      return "png";
  }
}

async function cleanupExpiredPastedImages(directoryPath: string): Promise<void> {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const expirationThreshold = Date.now() - PASTED_IMAGE_RETENTION_MS;

    await Promise.all(entries.map(async (entry) => {
      if (!entry.isFile()) {
        return;
      }

      const entryPath = path.join(directoryPath, entry.name);
      const stat = await fs.stat(entryPath).catch(() => null);
      if (!stat || stat.mtimeMs >= expirationThreshold) {
        return;
      }
      await fs.rm(entryPath, { force: true }).catch(() => undefined);
    }));
  } catch {
    // Ignore best-effort temp cleanup failures.
  }
}

export async function savePastedImage(payload: SavePastedImagePayload): Promise<PastedImageReference> {
  const mimeType = payload.mimeType.startsWith("image/") ? payload.mimeType : "image/png";
  const extension = getImageExtension(mimeType);
  await fs.mkdir(PASTED_IMAGES_DIRECTORY, { recursive: true });
  void cleanupExpiredPastedImages(PASTED_IMAGES_DIRECTORY);

  const filePath = path.join(
    PASTED_IMAGES_DIRECTORY,
    `pasted-image-${Date.now()}-${randomUUID()}.${extension}`
  );
  await fs.writeFile(filePath, Buffer.from(payload.data));

  return {
    path: filePath,
    mimeType,
    placeholder: PASTED_IMAGE_PLACEHOLDER
  };
}
