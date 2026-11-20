import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { KeyRound } from "lucide-react";
import { SECRET_NAME_MAX, SECRET_PURPOSE_MAX } from "@shared/secrets/contracts";
import { EVERY_WORKSPACE_LABEL, buildVaultSecret, normalizeSecretName, vaultFormFor } from "@/components/app/logic/secretVault";
import { Field } from "@/components/app/shared/Field";
import type { VaultSecretDialogProps, VaultSecretForm } from "@/components/app/types/secretVault.types";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Adds a secret to the vault, or replaces a saved one's value. A saved value is never shown again, so replacing means retyping it. */
export function VaultSecretDialog({ target, workspaces, onClose, onSave }: VaultSecretDialogProps) {
  const [form, setForm] = useState<VaultSecretForm>(() => vaultFormFor({ kind: "add" }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const errorId = useId();
  // Reset on every open and close, so a typed value never lingers in a closed dialog.
  useEffect(() => { setForm(vaultFormFor(target ?? { kind: "add" })); setError(null); setSaving(false); }, [target]);
  const update = (patch: Partial<VaultSecretForm>): void => { setForm((current) => ({ ...current, ...patch })); setError(null); };
  const replacing = target?.kind === "replace";

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    const result = buildVaultSecret(form);
    if (!result.ok) { setError(result.message); return; }
    setSaving(true);
    try { await onSave(result.secret); onClose(); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : "The secret could not be saved."); setSaving(false); }
  };

  return <Dialog.Root open={target !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
        <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" onClose={onClose}
          headerTitle={<Dialog.Title className="flex items-center gap-2"><KeyRound className="size-4 text-primary" />{replacing ? `Replace ${form.name}` : "Add secret"}</Dialog.Title>}>
          <DialogHeader>
            <Dialog.Description className="text-sm text-muted-foreground">
              {replacing ? "Enter the new value. The value saved now cannot be shown, only replaced."
                : "Save a password, API key or token for agents to use by name in commands you approve. They never see its value."}
            </Dialog.Description>
          </DialogHeader>
          <form className="flex min-h-0 flex-col" onSubmit={(event) => void submit(event)} aria-describedby={error ? errorId : undefined}>
            <DialogBody className="space-y-4">
              {!replacing && <Field label="Name">
                <Input autoFocus required maxLength={SECRET_NAME_MAX} placeholder="GITHUB_TOKEN" className="font-mono" autoComplete="off" spellCheck={false}
                  value={form.name} onChange={(event) => update({ name: normalizeSecretName(event.target.value) })} />
              </Field>}
              <Field label="What it is for">
                <Input maxLength={SECRET_PURPOSE_MAX} placeholder="Publishing releases to GitHub" value={form.purpose} onChange={(event) => update({ purpose: event.target.value })} />
              </Field>
              {!replacing && <Field label="Available in">
                <Select aria-label="Available in" value={form.projectId} onChange={(event) => update({ projectId: event.target.value })}>
                  <option value="">{EVERY_WORKSPACE_LABEL}</option>
                  {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                </Select>
              </Field>}
              <Field label="Value">
                {/* Masked like a password field, while keeping the line breaks of keys and certificates. */}
                <Textarea autoFocus={replacing} required rows={3} autoComplete="off" spellCheck={false} className="min-h-0 resize-y font-mono [-webkit-text-security:disc]"
                  value={form.value} onChange={(event) => update({ value: event.target.value })} />
              </Field>
              <p className="text-xs text-muted-foreground">Encrypted with your system keychain on this computer. It is not synced and is never sent to a model.</p>
              {error ? <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p> : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : replacing ? "Replace value" : "Add secret"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
