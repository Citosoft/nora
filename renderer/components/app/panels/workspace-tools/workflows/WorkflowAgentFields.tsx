import { Field } from "@/components/app/shared/Field";
import type { WorkflowAgentFieldsProps } from "@/components/app/types/workflowSurface.types";
import { Select } from "@/components/ui/select";
import { ProviderOptionLabel } from "../../settings/ProviderOptionLabel";
import { WorkflowModelSelect } from "./WorkflowModelSelect";

/** Agent and model for one workflow role; switching agent resets the model to that agent's default. */
export function WorkflowAgentFields({ tools, providers, catalogs, value, onChange }: WorkflowAgentFieldsProps) {
  const provider = providers.find((entry) => entry.kind === value.toolId && (!value.instanceId || entry.instanceId === value.instanceId)) ?? null;
  const available = providers.filter((entry) => tools.some((tool) => tool.id === entry.kind));
  const fixedModelNote = !provider || !catalogs ? "Models aren't available right now. The thread will use its runtime's default model." : null;
  return <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Agent">
      <Select aria-label="Agent" className="w-full" value={value.instanceId ?? provider?.instanceId ?? ""}
        onChange={(event) => {
          const selected = available.find((entry) => entry.instanceId === event.target.value);
          if (selected) onChange({ toolId: selected.kind, instanceId: selected.instanceId, model: null });
        }}>
        {available.map((entry) => <option key={entry.instanceId} value={entry.instanceId}><ProviderOptionLabel kind={entry.kind} label={entry.label} /></option>)}
      </Select>
    </Field>
    <div className="grid content-start gap-2 text-sm font-medium text-foreground">
      <span>Model</span>
      {provider && catalogs
        ? <WorkflowModelSelect provider={provider} catalogs={catalogs} toolId={value.toolId} model={value.model}
          onChange={(model) => onChange({ toolId: value.toolId, instanceId: value.instanceId, model })} />
        : <>
          <Select aria-label="Model" className="w-full" value={value.model ?? ""} disabled={!value.model}
            onChange={(event) => onChange({ toolId: value.toolId, instanceId: value.instanceId, model: event.target.value || null })}>
            <option value=""><ProviderOptionLabel kind={value.toolId} label="Agent default" /></option>
            {value.model ? <option value={value.model}><ProviderOptionLabel kind={value.toolId} label={value.model} /></option> : null}
          </Select>
          {fixedModelNote ? <p className="text-xs font-normal text-muted-foreground">{fixedModelNote}</p> : null}
        </>}
    </div>
  </div>;
}
