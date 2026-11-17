import { useRef, useState } from "react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { COMPOSER_ATTACHMENT_MAX_BYTES, COMPOSER_ATTACHMENT_MAX_COUNT } from "@shared/composerAttachments";
import type { ComposerAttachmentsInput } from "@/components/app/types/composerAttachments.types";

export function useComposerAttachments({ attachments, disabled, onAdd }: ComposerAttachmentsInput) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const addFiles = async (files: readonly File[]): Promise<void> => {
    if (disabled || inFlight.current || !files.length) return;
    setError(null);
    if (attachments.length + files.length > COMPOSER_ATTACHMENT_MAX_COUNT) {
      setError(`Attach up to ${COMPOSER_ATTACHMENT_MAX_COUNT} files per instruction.`); return;
    }
    if (files.some((file) => file.size > COMPOSER_ATTACHMENT_MAX_BYTES)) {
      setError("Files must be 20 MB or smaller."); return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      // Keep successful files even when another file in the batch cannot be read.
      for (const file of files) {
        const attachment = await noraSystemClient.saveComposerAttachment({ name: file.name || "pasted-image.png",
          mimeType: file.type, data: new Uint8Array(await file.arrayBuffer()) });
        onAdd([attachment]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The attachment could not be saved. Try choosing the file again.");
    } finally { inFlight.current = false; setSaving(false); }
  };
  return { saving, error, addFiles };
}
