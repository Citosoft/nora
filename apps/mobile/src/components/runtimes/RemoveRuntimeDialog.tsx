import { useState } from "react";
import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import { errorMessage } from "@/api/http/remoteRequestError";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

interface RemoveRuntimeDialogProps {
  runtime: RuntimeDirectoryEntry | null;
  onRemove: (installationId: string) => Promise<void>;
  onClose: () => void;
}

/** Removing unlinks the computer from the account (Worker DELETE), so the confirmation spells out the consequence. */
export function RemoveRuntimeDialog({ runtime, onRemove, onClose }: RemoveRuntimeDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async (): Promise<void> => {
    if (!runtime) return;
    setBusy(true);
    setError(null);
    try {
      await onRemove(runtime.installationId);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConfirmDialog visible={runtime !== null} title={`Remove ${runtime?.name ?? "computer"}?`}
      message={"This unlinks the computer from your Nora account and turns off its remote address. You won't be able to reach it from here until you turn on Remote access again in Nora Desktop. Nothing on the computer is deleted."}
      confirmLabel="Remove" destructive busy={busy} error={error}
      onConfirm={() => void confirm()} onCancel={() => { setError(null); onClose(); }} />
  );
}
