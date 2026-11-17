import { useState } from "react";
import { useClerk } from "@clerk/expo";
import { errorMessage } from "@/api/http/remoteRequestError";
import { useRemoteAccess } from "@/hooks/useRemoteAccess";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";

export function SignOutSection() {
  const clerk = useClerk();
  const services = useRemoteAccess();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signOut = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await services.forgetDeviceData();
      await clerk.signOut();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };
  return (
    <ListSection>
      <ListRow title="Sign Out" centered destructive onPress={() => setConfirming(true)} />
      <ConfirmDialog visible={confirming} title="Sign out of Nora?" confirmLabel="Sign Out" destructive busy={busy} error={error}
        message="This device forgets your computers and any messages that haven't been delivered. Agents keep running on your computers."
        onConfirm={() => void signOut()} onCancel={() => setConfirming(false)} />
    </ListSection>
  );
}
