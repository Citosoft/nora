import { useMemo, useState } from "react";
import { useNativeModelCatalog } from "@/components/app/hooks/useNativeModelCatalog";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { createModelCatalogStore, nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { ProviderModelFieldsProps } from "@/components/app/types/modelPicker.types";
import { Select } from "@/components/ui/select";
import { ProviderOptionLabel } from "./ProviderOptionLabel";

export function ProviderModelFields({ workspace, value, onChange, labels, disabled = false, error = null, unsupportedReason }: ProviderModelFieldsProps) {
  const { boot, store } = useNativeRuntimePorts();
  const savedKey = value ? nativeProviderKey(value) : "";
  const [providerKey, setProviderKey] = useState(savedKey);
  const catalogs = useMemo(() => createModelCatalogStore({ client: store.client, workspace }), [store.client, workspace]);
  const provider = boot.providers.find((entry) => nativeProviderKey(entry) === providerKey) ?? null;
  const catalog = useNativeModelCatalog(catalogs, provider);
  const models = catalog.status === "available" ? catalog.catalog.models : [];
  const unsupported = catalog.status === "available" ? unsupportedReason?.(catalog.catalog) ?? null : null;
  const modelId = value && savedKey === providerKey ? value.model : "";
  const status = !provider ? null : unsupported ?? (catalog.status === "unavailable" ? catalog.failure.message
    : catalog.status === "available" && !models.length ? "This provider has no available models."
    : catalog.status === "available" && !modelId ? "Choose a model." : null);
  if (provider && (catalog.status === "idle" || catalog.status === "loading")) {
    return <div aria-busy="true" className="min-h-9"><p role="status" className="text-sm text-muted-foreground">Loading provider and model options…</p></div>;
  }
  if (!boot.providers.length && !value) return <p role="status" className="text-sm text-muted-foreground">No providers are available.</p>;
  return <div className="space-y-2">
    <Select aria-label={labels.provider} className="w-full" value={providerKey} disabled={disabled}
      onChange={(event) => { setProviderKey(event.target.value); if (!event.target.value) onChange(null); }}>
      {labels.clear ? <option value="">{labels.clear}</option> : <option value="" disabled>Choose a provider</option>}
      {boot.providers.map((entry) => <option key={nativeProviderKey(entry)} value={nativeProviderKey(entry)}><ProviderOptionLabel kind={entry.kind} label={entry.label} /></option>)}
      {value && !boot.providers.some((entry) => nativeProviderKey(entry) === savedKey) && <option value={savedKey}><ProviderOptionLabel kind={value.kind} label={`${value.kind} (unavailable)`} /></option>}
    </Select>
    {provider && catalog.status === "available" && !unsupported && models.length > 0 && <Select aria-label={labels.model} className="w-full" value={modelId} disabled={disabled}
      onChange={(event) => { if (event.target.value) onChange({ kind: provider.kind, instanceId: provider.instanceId, model: event.target.value }); }}>
      <option value="" disabled>Choose a model</option>
      {models.map((model) => <option key={model.id} value={model.id}><ProviderOptionLabel kind={provider.kind} label={model.name || model.id} /></option>)}
      {modelId && !models.some((model) => model.id === modelId) && <option value={modelId}><ProviderOptionLabel kind={provider.kind} label={`${modelId} (unavailable)`} /></option>}
    </Select>}
    {(error ?? status) && <p role={error ? "alert" : "status"} className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>{error ?? status}</p>}
  </div>;
}
