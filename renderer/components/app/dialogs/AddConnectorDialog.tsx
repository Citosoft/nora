import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plug } from "lucide-react";
import { ADD_CONNECTOR_STEPS, EMPTY_CONNECTOR_FORM, buildConnectorInput, resolveAddConnectorStep } from "@/components/app/logic/connectorForm";
import { WizardProgress } from "@/components/app/shared/WizardProgress";
import type { AddConnectorDialogProps, AddConnectorStep, ConnectorFormState } from "@/components/app/types/noraConnectors.types";
import type { WizardProgressStep } from "@/components/app/types/wizardProgress.types";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { AddConnectorAuthStep } from "./AddConnectorAuthStep";
import { AddConnectorServerStep } from "./AddConnectorServerStep";
import { ConnectorAccessFields } from "./ConnectorAccessFields";

const TITLES: Readonly<Record<AddConnectorStep, string>> = { server: "Server", auth: "Authentication", access: "Availability" };
const STEPS: WizardProgressStep<AddConnectorStep>[] = ADD_CONNECTOR_STEPS.map((id) => ({ id, title: TITLES[id] }));
const DESCRIPTIONS: Readonly<Record<AddConnectorStep, string>> = {
  server: "Connect a remote MCP server to Nora. Enter its address and the name your threads will see.",
  auth: "Choose how Nora signs in to the server. Nora keeps the credentials; threads never see them.",
  access: "Choose which workspaces and threads get this connector. You can change this later from its menu."
};

/**
 * Adds a remote MCP server (Streamable HTTP) as a Nora connector in three steps: the server, how Nora authenticates to it,
 * then where it is available. Sign-in happens from the connector's row once it is added.
 */
export function AddConnectorDialog({ open, onOpenChange, onCreate, accessChoices }: AddConnectorDialogProps) {
  const [form, setForm] = useState<ConnectorFormState>(EMPTY_CONNECTOR_FORM);
  const [step, setStep] = useState<AddConnectorStep>("server");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const errorId = useId();
  useEffect(() => { if (!open) { setForm(EMPTY_CONNECTOR_FORM); setStep("server"); setError(null); setSaving(false); } }, [open]);
  const update = (patch: Partial<ConnectorFormState>) => { setForm((current) => ({ ...current, ...patch })); setError(null); };

  /** A later step is only reachable once earlier ones are valid, so no step fails on a field the user can no longer see. */
  const goTo = (target: AddConnectorStep) => {
    const resolved = resolveAddConnectorStep(form, target);
    setStep(resolved.step);
    setError(resolved.error);
  };
  const index = ADD_CONNECTOR_STEPS.indexOf(step);
  const previous = ADD_CONNECTOR_STEPS[index - 1];
  const next = ADD_CONNECTOR_STEPS[index + 1];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // React bubbles submit through the portal, so stop it reaching a form this dialog is opened from (the chat composer).
    event.stopPropagation();
    if (next) { goTo(next); return; }
    const result = buildConnectorInput(form, accessChoices);
    if (!result.ok) { setError(result.message); return; }
    setSaving(true);
    try { await onCreate(result.input); onOpenChange(false); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : "The connector could not be added."); setSaving(false); }
  };

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80 backdrop-blur-sm" />
      {/* Join the modal stack so Settings releases pointer events and focus. */}
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
        <DialogContent className="w-[min(34rem,calc(100vw-2rem))]" onClose={() => onOpenChange(false)} headerTitle={<Dialog.Title className="flex items-center gap-2"><Plug className="size-4 text-primary" />Add connector</Dialog.Title>}>
          <DialogHeader>
            <WizardProgress ariaLabel="Add connector" steps={STEPS} activeStep={step} onStepChange={goTo} />
            <Dialog.Description className="text-sm text-muted-foreground">{DESCRIPTIONS[step]}</Dialog.Description>
          </DialogHeader>
          {/* The form sits inside the dialog chrome so the header's close button never submits it. */}
          <form className="flex min-h-0 flex-col" onSubmit={(event) => void submit(event)} aria-describedby={error ? errorId : undefined}>
            <DialogBody className="space-y-4">
              {step === "server" ? <AddConnectorServerStep form={form} update={update} />
                : step === "auth" ? <AddConnectorAuthStep form={form} update={update} />
                : <ConnectorAccessFields value={form.access} choices={accessChoices} onChange={(access) => update({ access })} />}
              {error ? <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p> : null}
            </DialogBody>
            <DialogFooter>
              {previous ? <Button type="button" variant="outline" onClick={() => goTo(previous)}>Back</Button>
                : <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>}
              {next ? <Button type="submit">Next</Button>
                : <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add connector"}</Button>}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
