import { useId, useState } from "react";
import type { FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plug } from "lucide-react";
import { buildConnectorAccess, connectorAccessDraft } from "@/components/app/logic/connectorAccess";
import type { ConnectorAccessDialogProps, ConnectorAccessDraft, ConnectorAccessFormProps } from "@/components/app/types/noraConnectors.types";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { ConnectorAccessFields } from "./ConnectorAccessFields";

/** Changes which workspaces and bots get a connector; threads pick the change up on their next turn. */
export function ConnectorAccessDialog({ connector, accessChoices, onClose, onSave }: ConnectorAccessDialogProps) {
  return <Dialog.Root open={!!connector} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
        <DialogContent className="w-[min(30rem,calc(100vw-2rem))]" onClose={onClose}
          headerTitle={<Dialog.Title className="flex items-center gap-2"><Plug className="size-4 text-primary" />Where {connector?.name ?? "this connector"} is available</Dialog.Title>}>
          <DialogHeader>
            <Dialog.Description className="text-sm text-muted-foreground">Threads pick up a change on their next turn.</Dialog.Description>
          </DialogHeader>
          {/* Keyed so each opened connector starts from its stored rule, not from list updates while the dialog is open. */}
          {connector ? <AccessForm key={connector.id} connector={connector} accessChoices={accessChoices} onClose={onClose} onSave={onSave} /> : null}
        </DialogContent>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function AccessForm({ connector, accessChoices, onClose, onSave }: ConnectorAccessFormProps) {
  const [draft, setDraft] = useState<ConnectorAccessDraft>(() => connectorAccessDraft(connector.access));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const errorId = useId();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // React bubbles submit through the portal, so stop it reaching a form this dialog is opened from (the chat composer).
    event.stopPropagation();
    const result = buildConnectorAccess(draft, accessChoices);
    if (!result.ok) { setError(result.message); return; }
    setSaving(true);
    try { await onSave(connector.id, result.access); onClose(); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : "The change could not be saved."); setSaving(false); }
  };
  return <form className="flex min-h-0 flex-col" onSubmit={(event) => void submit(event)} aria-describedby={error ? errorId : undefined}>
    <DialogBody className="space-y-4">
      <ConnectorAccessFields value={draft} choices={accessChoices} onChange={(next) => { setDraft(next); setError(null); }} />
      {error ? <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p> : null}
    </DialogBody>
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
    </DialogFooter>
  </form>;
}
