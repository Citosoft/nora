import { useEffect, useRef, useState } from "react";
import { COMPOSER_ATTACHMENT_MAX_BYTES } from "@shared/composerAttachments";
import type { ComposerAttachments, ComposerDraftAttachment, ComposerFileSource } from "@/types/composerAttachments.types";
import type { RuntimeClient } from "@/types/runtimeClient.types";
import type { CapabilityGate } from "@/types/runtimeSession.types";
import { readComposerFile } from "@/platform/composerFiles";
import { pickComposerFiles } from "@/platform/pickComposerFiles";
import { base64FileBytes, validateComposerFiles } from "@/state/composerFiles";

/** Upload once to the desktop's durable attachment storage; pending messages retain those references on retry. */
export function useComposerAttachments(client: RuntimeClient, gate: CapabilityGate): ComposerAttachments {
  const [files, setFiles] = useState<readonly ComposerDraftAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);

  const pick = async (source: ComposerFileSource): Promise<void> => {
    if (locked.current) return;
    if (!gate.enabled) { setError(gate.reason); return; }
    locked.current = true;
    const epoch = generation.current;
    const current = () => epoch === generation.current;
    setError(null); setBusy(true);
    try {
      const selected = await pickComposerFiles(source);
      if (!current()) return;
      const problem = validateComposerFiles(files.length, selected);
      if (problem) throw new Error(problem);
      for (const [index, picked] of selected.entries()) {
        setProgress(`Uploading ${index + 1} of ${selected.length}…`);
        const data = await readComposerFile(picked.uri);
        if (!current()) return;
        if (base64FileBytes(data) > COMPOSER_ATTACHMENT_MAX_BYTES) throw new Error("Files must be 20 MB or smaller.");
        const file = await client.uploadAttachment({ name: picked.name, mimeType: picked.mimeType, data });
        if (!current()) return;
        setFiles((previous) => [...previous, { file, uri: picked.uri }]);
      }
    } catch (cause) {
      if (current()) setError(cause instanceof Error ? cause.message : "This file could not be attached. Try choosing it again.");
    } finally {
      locked.current = false;
      if (current()) { setBusy(false); setProgress(null); }
    }
  };
  return { files, busy, progress, error, pick,
    remove: (id) => { if (!locked.current) setFiles((previous) => previous.filter((entry) => entry.file.id !== id)); },
    clear: () => { setFiles([]); setError(null); } };
}
