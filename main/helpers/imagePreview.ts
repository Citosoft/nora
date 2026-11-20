import fs from "node:fs/promises";
import sharp from "sharp";
import type { ImagePreviewOptions } from "@main/types/imagePreview.types";
import type { ToolImagePreview } from "@shared/types/conversation/queries.types";

/** Caps decoding work for hostile or huge images before any pixels are processed. */
const MAX_INPUT_PIXELS = 40_000_000;

/**
 * Decodes an image file into a bounded WebP data URL, so callers never pass the original bytes on.
 * Missing, oversized or undecodable files return null; previews must never fail the surrounding view.
 */
export async function readImagePreview(filePath: string, { maxEdge, maxBytes, quality }: ImagePreviewOptions): Promise<ToolImagePreview | null> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    const { data, info } = await sharp(filePath, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate().resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true });
    return { dataUrl: `data:image/webp;base64,${data.toString("base64")}`, width: info.width, height: info.height };
  } catch {
    return null;
  }
}
