import { Field } from "@/components/app/shared/Field";
import { suggestConnectorName } from "@/components/app/logic/connectorForm";
import type { AddConnectorFormStepProps } from "@/components/app/types/noraConnectors.types";
import { Input } from "@/components/ui/input";

/** The add dialog's first step: the server's URL and the name Nora shows for it. */
export function AddConnectorServerStep({ form, update }: AddConnectorFormStepProps) {
  return <>
    <Field label="Server URL">
      <Input autoFocus required type="url" inputMode="url" placeholder="https://mcp.example.com/mcp" value={form.url}
        onChange={(event) => update({ url: event.target.value })} />
    </Field>
    <Field label="Name">
      <Input maxLength={80} placeholder={suggestConnectorName(form.url) || "Example"} value={form.name} onChange={(event) => update({ name: event.target.value })} />
    </Field>
  </>;
}
