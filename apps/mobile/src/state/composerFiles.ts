import { COMPOSER_ATTACHMENT_MAX_BYTES, COMPOSER_ATTACHMENT_MAX_COUNT } from "@shared/composerAttachments";
import type { PickedComposerFile } from "@/types/composerAttachments.types";

export function validateComposerFiles(existing: number, files: readonly PickedComposerFile[]): string | null {
  if (existing + files.length > COMPOSER_ATTACHMENT_MAX_COUNT) return `Attach up to ${COMPOSER_ATTACHMENT_MAX_COUNT} files per message.`;
  if (files.some((file) => file.size !== null && file.size > COMPOSER_ATTACHMENT_MAX_BYTES)) return "Files must be 20 MB or smaller.";
  return null;
}

export function base64FileBytes(data: string): number {
  return data.length / 4 * 3 - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
}

export function attachmentSize(size: number): string {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
