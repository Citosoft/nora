import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { COMPOSER_ATTACHMENT_MAX_BYTES } from "@shared/composerAttachments";
import type { ComposerAttachment } from "@shared/types/agentInput.types";

const payloadSchema = z.object({
  name: z.string().min(1).max(255), mimeType: z.string().max(255),
  data: z.instanceof(Uint8Array).refine((data) => data.byteLength <= COMPOSER_ATTACHMENT_MAX_BYTES, "Files must be 20 MB or smaller.")
}).strict();

export async function saveComposerAttachment(payload: unknown, storageRoot: string): Promise<ComposerAttachment> {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) throw new Error("This attachment could not be read. Choose a file of 20 MB or smaller.");
  const { name, mimeType, data } = parsed.data;
  const id = randomUUID();
  // Never let a supplied filename choose a directory or overwrite another attachment.
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "attachment";
  const directory = path.join(storageRoot, "chat-attachments");
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${id}-${safeName}`);
  await fs.writeFile(filePath, data, { flag: "wx", mode: 0o600 });
  return { id, name, path: filePath, mimeType: mimeType || "application/octet-stream", size: data.byteLength };
}

/** Only app-owned attachments may be decoded through the thumbnail IPC boundary. */
export async function readComposerAttachmentThumbnail(filePath: unknown, storageRoot: string): Promise<string | null> {
  const parsed = z.string().min(1).max(32768).safeParse(filePath);
  if (!parsed.success) return null;
  try {
    const directory = await fs.realpath(path.join(storageRoot, "chat-attachments"));
    const resolved = await fs.realpath(parsed.data);
    if (path.dirname(resolved) !== directory) return null;
    const stat = await fs.stat(resolved);
    if (!stat.isFile() || stat.size > COMPOSER_ATTACHMENT_MAX_BYTES) return null;
    const thumbnail = await sharp(resolved, { limitInputPixels: 40_000_000 })
      .rotate().resize(128, 128, { fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
    return `data:image/webp;base64,${thumbnail.toString("base64")}`;
  } catch {
    // A missing or unsupported image must not prevent sending the original file.
    return null;
  }
}
