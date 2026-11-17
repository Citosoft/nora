import { useEffect, useState } from "react";
import { runtimeNameSchema } from "@shared/remote-access/directory";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import { REMOTE_LIMITS } from "@shared/remote-access/constants";
import { errorMessage } from "@/api/http/remoteRequestError";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TextField } from "@/components/common/TextField";

interface RenameRuntimeDialogProps {
  runtime: RuntimeDirectoryEntry | null;
  onRename: (installationId: string, name: string) => Promise<void>;
  onClose: () => void;
}

export function RenameRuntimeDialog({ runtime, onRename, onClose }: RenameRuntimeDialogProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setName(runtime?.name ?? "");
    setError(null);
  }, [runtime]);

  const submit = async (): Promise<void> => {
    if (!runtime) return;
    const parsed = runtimeNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(`Use 1–${REMOTE_LIMITS.runtimeNameMaxLength} characters.`);
      return;
    }
    setBusy(true);
    try {
      await onRename(runtime.installationId, parsed.data);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog visible={runtime !== null} title="Rename computer" message="Choose a name you'll recognise, like “Work laptop”."
      confirmLabel="Save" busy={busy} error={error} onConfirm={() => void submit()} onCancel={onClose}>
      <TextField label="Name" hideLabel value={name} onChangeText={setName} maxLength={REMOTE_LIMITS.runtimeNameMaxLength} autoFocus
        returnKeyType="done" onSubmitEditing={() => void submit()} />
    </ConfirmDialog>
  );
}
