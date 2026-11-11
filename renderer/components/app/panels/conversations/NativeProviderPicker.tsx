import { useEffect, useMemo, useState } from "react";
import { createModelCatalogStore, nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import { resolveModelBinding, selectedNativeModel } from "@/components/app/logic/modelBinding";
import { useNativeModelCatalog } from "@/components/app/hooks/useNativeModelCatalog";
import type { NativeProviderPickerProps } from "@/components/app/types/nativePanels.types";
import type { ModelChoice } from "@/components/app/types/modelPicker.types";
import { NativeModelOptions } from "./NativeModelOptions";
import { NativeModelPopover } from "./NativeModelPopover";

export function NativeProviderPicker({ state, workspace, client, locked, initial, onBinding, onCapabilities }: NativeProviderPickerProps) {
  const saved = locked ?? initial;
  const [choice, setChoice] = useState<ModelChoice>(() => ({ providerKey: saved ? nativeProviderKey(saved) : state.providers[0] ? nativeProviderKey(state.providers[0]) : "", modelId: saved?.model ?? null }));
  const [policy, setPolicy] = useState<string | null>(initial?.permissionPolicy ?? null);
  const [needsPolicy, setNeedsPolicy] = useState(false);
  const [reasoning, setReasoning] = useState<string | null>(initial?.reasoning ?? null);
  const store = useMemo(() => createModelCatalogStore({ client, workspace: workspace.workspace }), [client, workspace.workspace]);
  const selectedKey = locked ? nativeProviderKey(locked) : choice.providerKey;
  const provider = state.providers.find((entry) => nativeProviderKey(entry) === selectedKey) ?? (!selectedKey ? state.providers[0] ?? null : null);
  const catalog = useNativeModelCatalog(store, provider);
  const modelId = locked?.model ?? choice.modelId;
  const model = selectedNativeModel(catalog, modelId);
  const available = catalog.status === "available" ? catalog.catalog : null;
  const policyId = locked?.permissionPolicy ?? policy ?? (needsPolicy ? "" : available?.policies[0]?.id ?? "");
  const effort = locked ? locked.reasoning : reasoning;
  const resolution = useMemo(() => resolveModelBinding({ provider, catalog, modelId, policyId, reasoning: effort, locked }),
    [provider, catalog, modelId, policyId, effort, locked]);
  // Resolve inherited defaults once; a later catalog reorder must not silently change the model.
  useEffect(() => {
    if (!locked && choice.modelId === null && provider && model) setChoice({ providerKey: nativeProviderKey(provider), modelId: model.id });
  }, [locked, choice.modelId, provider, model]);
  useEffect(() => {
    if (!locked && policy === null && !needsPolicy && available?.policies[0]) setPolicy(available.policies[0].id);
  }, [locked, policy, needsPolicy, available]);
  useEffect(() => { onBinding(resolution.status === "ready" ? resolution.binding : null); }, [resolution, onBinding]);
  useEffect(() => { onCapabilities?.(available?.capabilities ?? null); }, [available, onCapabilities]);
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-1">
      <NativeModelPopover providers={state.providers} store={store} selectedProvider={provider} selectedModel={model} selectedModelId={modelId} locked={!!locked}
        onSelect={(nextProvider, nextModel) => {
          if (locked) return;
          const key = nativeProviderKey(nextProvider);
          const changedProvider = key !== (provider ? nativeProviderKey(provider) : null);
          if (changedProvider) { setPolicy(null); setNeedsPolicy(true); }
          if (changedProvider || model?.id !== nextModel.id) setReasoning(null);
          setChoice({ providerKey: key, modelId: nextModel.id });
        }} />
      <NativeModelOptions catalog={available} model={model} policyId={policyId} reasoning={effort} locked={!!locked}
        onPolicy={(value) => { setPolicy(value); setNeedsPolicy(false); }} onReasoning={setReasoning} />
    </div>
    {!state.providers.length ? <p className="text-xs text-muted-foreground">Install Codex or Claude Code, sign in using its CLI, and restart Nora. Your draft stays here.</p>
      : resolution.status === "blocked" && resolution.message ? <p role="status" className="text-xs text-muted-foreground">{resolution.message}</p> : null}
  </div>;
}
