import { useCallback, useEffect, useMemo, useState } from "react";
import { secretClient } from "@/components/app/clients/secretClient";
import type { VaultSecret } from "@shared/types/secrets/secrets.types";
import type { SecretVault, SecretVaultClient } from "@/components/app/types/secretVault.types";

/**
 * The saved secrets Settings manages, kept current by main's change notifications so one saved from a thread's secure dialog
 * shows up at once. Only names, purposes and scopes are ever held here; a value leaves the form once and is not kept.
 */
export function useSecretVault(client: SecretVaultClient = secretClient): SecretVault {
  const [secrets, setSecrets] = useState<readonly VaultSecret[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = client.onVaultChanged((next) => { if (active) setSecrets(next); });
    client.vault({ kind: "list" }).then((next) => { if (active) { setSecrets(next); setLoadError(null); } },
      (error: unknown) => { if (active) setLoadError(error instanceof Error && error.message ? error.message : "Saved secrets could not be loaded."); });
    return () => { active = false; unsubscribe(); };
  }, [client]);

  const save = useCallback<SecretVault["save"]>(async (secret) => { setSecrets(await client.vault({ kind: "save", ...secret })); }, [client]);
  const remove = useCallback<SecretVault["remove"]>(async ({ name, projectId }) => { setSecrets(await client.vault({ kind: "remove", name, projectId })); }, [client]);
  return useMemo(() => ({ secrets, loadError, save, remove }), [secrets, loadError, save, remove]);
}
