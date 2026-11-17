import { useNativeModelCatalog } from "@/components/app/hooks/useNativeModelCatalog";
import type { WorkflowModelSelectProps } from "@/components/app/types/workflowSurface.types";
import { Select } from "@/components/ui/select";
import { ProviderOptionLabel } from "../../settings/ProviderOptionLabel";

/** Lists the agent's models from its runtime catalog; the empty choice keeps the agent's own default model. */
export function WorkflowModelSelect({ provider, catalogs, toolId, model, onChange }: WorkflowModelSelectProps) {
  const catalog = useNativeModelCatalog(catalogs, provider);
  const loading = catalog.status === "idle" || catalog.status === "loading";
  const models = catalog.status === "available" ? catalog.catalog.models : [];
  const status = catalog.status === "unavailable" ? catalog.failure.message : null;
  return <>
    <Select aria-label="Model" className="w-full" value={model ?? ""} disabled={loading}
      onChange={(event) => onChange(event.target.value || null)}>
      <option value="">{loading ? "Loading models…" : <ProviderOptionLabel kind={toolId} label="Agent default" />}</option>
      {models.map((entry) => <option key={entry.id} value={entry.id}><ProviderOptionLabel kind={toolId} label={entry.name || entry.id} /></option>)}
      {model && !loading && !models.some((entry) => entry.id === model)
        ? <option value={model}><ProviderOptionLabel kind={toolId} label={`${model} (unavailable)`} /></option> : null}
    </Select>
    {status ? <p role="status" className="text-xs font-normal text-muted-foreground">{status}</p> : null}
  </>;
}
