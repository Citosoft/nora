import { useState } from "react";
import { Plus, Vault } from "lucide-react";
import type { VaultSecret } from "@shared/types/secrets/secrets.types";
import { DeleteVaultSecretDialog } from "@/components/app/dialogs/DeleteVaultSecretDialog";
import { VaultSecretDialog } from "@/components/app/dialogs/VaultSecretDialog";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useSecretVault } from "@/components/app/hooks/useSecretVault";
import { settingAnchorAttributes } from "@/components/app/logic/settingsSearch";
import { vaultScopeLabel, vaultSecretKey } from "@/components/app/logic/secretVault";
import { SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import type { VaultDialogTarget } from "@/components/app/types/secretVault.types";
import { Button } from "@/components/ui/button";
import { VaultSecretRow } from "./VaultSecretRow";

const HEADER_CLASS_NAME = "px-3 py-2 font-medium text-muted-foreground";

/** The secrets agents can use by name: saved here or through a thread's secure dialog, and only ever replaced or deleted, never shown. */
export function VaultSettingsSection() {
  const { boot } = useNativeRuntimePorts();
  const vault = useSecretVault();
  const [editing, setEditing] = useState<VaultDialogTarget | null>(null);
  const [deleting, setDeleting] = useState<VaultSecret | null>(null);
  const secrets = vault.secrets;

  return <div className="max-w-5xl">
    <SettingsSectionHeader title="Vault" icon={Vault}
      description="Passwords, API keys and tokens your agents can use without seeing them. Values are encrypted with your system keychain, stay on this computer, and never appear in a chat or reach a model. Agents ask for one through a secure dialog and use it by name in commands you approve." />
    <div className="mt-6 flex justify-end">
      <Button size="sm" onClick={() => setEditing({ kind: "add" })}><Plus className="size-3.5" aria-hidden="true" />Add secret</Button>
    </div>
    <div {...settingAnchorAttributes("Saved secrets")} className="mt-4 space-y-3" aria-live="polite">
      {vault.loadError ? <p role="alert" className="text-sm text-destructive">{vault.loadError}</p> : null}
      {secrets?.length ? <div className="overflow-x-auto rounded-md border border-border/60">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Saved secrets</caption>
          <thead className="border-b border-border/60 bg-muted/40 text-xs">
            <tr>
              <th scope="col" className={HEADER_CLASS_NAME}>Name</th>
              <th scope="col" className={HEADER_CLASS_NAME}>What it is for</th>
              <th scope="col" className={HEADER_CLASS_NAME}>Available in</th>
              <th scope="col" className={HEADER_CLASS_NAME}>Updated</th>
              <th scope="col" className={HEADER_CLASS_NAME}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {secrets.map((secret) => <VaultSecretRow key={vaultSecretKey(secret)} secret={secret} scopeLabel={vaultScopeLabel(secret.projectId, boot.workspaces)}
              onReplace={(target) => setEditing({ kind: "replace", secret: target })} onDelete={setDeleting} />)}
          </tbody>
        </table>
      </div> : secrets && !vault.loadError ? <p className="text-sm text-muted-foreground">No secrets are saved yet. Add one here, or let an agent ask for it when it needs one.</p>
        : !vault.loadError ? <p className="text-sm text-muted-foreground">Loading saved secrets…</p> : null}
    </div>
    <VaultSecretDialog target={editing} workspaces={boot.workspaces} onClose={() => setEditing(null)} onSave={vault.save} />
    <DeleteVaultSecretDialog secret={deleting} scopeLabel={deleting ? vaultScopeLabel(deleting.projectId, boot.workspaces) : ""}
      onClose={() => setDeleting(null)} onDelete={vault.remove} />
  </div>;
}
