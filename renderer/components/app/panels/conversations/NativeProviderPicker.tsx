import { useEffect, useMemo, useRef, useState } from "react";
import { createModelCatalogStore, nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import { inheritedModelId, inheritedSubagentModel, inheritedNativeProvider, resolveModelBinding, selectedNativeModel } from "@/components/app/logic/modelBinding";
import { threadPreferences } from "@shared/personalization/threads";
import { useNativeModelCatalog } from "@/components/app/hooks/useNativeModelCatalog";
import type { NativeProviderPickerProps } from "@/components/app/types/nativePanels.types";
import type { ModelChoice } from "@/components/app/types/modelPicker.types";
import { NativeModelPopover } from "./NativeModelPopover";
import { ProviderUsageWidget } from "./ProviderUsageWidget";
import { Button } from "@/components/ui/button";

export function NativeProviderPicker({ state, workspace, client, locked: current, initial, onBinding, onCapabilities, allowChange, startEditing = false }: NativeProviderPickerProps) {
  const [editing, setEditing] = useState(startEditing);
  const locked = current && !(editing && allowChange) ? current : null;
  const saved = locked ?? initial;
  // An inherited choice follows the configured thread default; an empty provider key and null model resolve it from the catalog.
  const [choice, setChoice] = useState<ModelChoice>(() => ({ providerKey: saved ? nativeProviderKey(saved) : "", modelId: saved?.model ?? null, inherited: !saved }));
  const defaults = state.personalization.threadModel ?? null;
  const defaultsKey = JSON.stringify(defaults);
  const appliedDefaults = useRef(defaultsKey);
  const [policy, setPolicy] = useState<string | null>(initial?.permissionPolicy ?? null);
  const [needsPolicy, setNeedsPolicy] = useState(false);
  const [reasoning, setReasoning] = useState<string | null>(initial?.reasoning ?? null);
  const [subagentModel, setSubagentModel] = useState<string | null | undefined>(initial ? initial.subagentModel ?? null : undefined);
  const store = useMemo(() => createModelCatalogStore({ client, workspace: workspace.workspace }), [client, workspace.workspace]);
  const selectedKey = locked ? nativeProviderKey(locked) : choice.providerKey;
  const provider = selectedKey ? state.providers.find((entry) => nativeProviderKey(entry) === selectedKey) ?? null : inheritedNativeProvider(state.providers, defaults);
  const catalog = useNativeModelCatalog(store, provider);
  const modelId = locked?.model ?? choice.modelId ?? inheritedModelId(catalog, provider, defaults);
  const model = selectedNativeModel(catalog, modelId);
  const available = catalog.status === "available" ? catalog.catalog : null;
  const policyId = locked?.permissionPolicy ?? policy ?? (needsPolicy ? "" : available?.policies[0]?.id ?? "");
  const effort = locked ? locked.reasoning : reasoning;
  const agentModel = locked ? locked.subagentModel ?? null : subagentModel !== undefined ? subagentModel
    : inheritedSubagentModel(catalog, provider, threadPreferences(state.personalization).subagentModel);
  const resolution = useMemo(() => resolveModelBinding({ provider, catalog, modelId, policyId, reasoning: effort, subagentModel: agentModel, locked }),
    [provider, catalog, modelId, policyId, effort, agentModel, locked]);
  // Resolve inherited defaults once; a later catalog reorder must not silently change the model.
  useEffect(() => {
    if (!locked && choice.modelId === null && provider && model) setChoice((current) => ({ ...current, providerKey: nativeProviderKey(provider), modelId: model.id }));
  }, [locked, choice.modelId, provider, model]);
  // A draft that never chose its own model follows a changed default; explicit choices are kept.
  useEffect(() => {
    if (appliedDefaults.current === defaultsKey) return;
    appliedDefaults.current = defaultsKey;
    if (locked || !choice.inherited) return;
    setChoice({ providerKey: "", modelId: null, inherited: true });
    setPolicy(null); setNeedsPolicy(false); setReasoning(null); setSubagentModel(undefined);
  }, [defaultsKey, locked, choice.inherited]);
  const choose = (): void => setChoice((current) => current.inherited ? { ...current, inherited: false } : current);
  useEffect(() => {
    if (!locked && policy === null && !needsPolicy && available?.policies[0]) setPolicy(available.policies[0].id);
  }, [locked, policy, needsPolicy, available]);
  const origin = choice.inherited && !locked ? "inherited" : "chosen";
  useEffect(() => { onBinding(resolution.status === "ready" ? resolution.binding : null, origin); }, [resolution, origin, onBinding]);
  useEffect(() => { onCapabilities?.(available?.capabilities ?? null); }, [available, onCapabilities]);
  return <div className="space-y-2">
    <div className="flex min-w-0 items-center gap-1">
      <NativeModelPopover providers={state.providers} store={store} selectedProvider={provider} selectedModel={model} selectedModelId={modelId} locked={!!locked}
        continuation={!!current}
        settings={{ catalog: available, policyId, reasoning: effort, subagentModel: agentModel,
          onPolicy: (value) => { choose(); setPolicy(value); setNeedsPolicy(false); },
          onReasoning: (value) => { choose(); setReasoning(value); }, onSubagentModel: (value) => { choose(); setSubagentModel(value); } }}
        onSelect={(nextProvider, nextModel) => {
          if (locked) return;
          const key = nativeProviderKey(nextProvider);
          const changedProvider = key !== (provider ? nativeProviderKey(provider) : null);
          if (changedProvider) { setPolicy(null); setNeedsPolicy(true); setSubagentModel(undefined); }
          if (changedProvider || model?.id !== nextModel.id) setReasoning(null);
          setChoice({ providerKey: key, modelId: nextModel.id, inherited: false });
        }} />
      <ProviderUsageWidget provider={provider} />
      {current && allowChange !== undefined && <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={!allowChange}
        aria-label={editing ? "Cancel provider change" : "Change provider or model"}
        onClick={() => {
          setChoice({ providerKey: nativeProviderKey(current), modelId: current.model, inherited: false });
          setPolicy(current.permissionPolicy); setNeedsPolicy(false); setReasoning(current.reasoning); setSubagentModel(current.subagentModel ?? null);
          setEditing((value) => !value);
        }}>{editing && allowChange ? "Cancel change" : "Change"}</Button>}
    </div>
    {editing && allowChange && <p className="text-xs text-muted-foreground">Your next send will apply changed settings in a fresh session, with a bounded history handoff. This chat's history stays here.</p>}
    {!state.providers.length ? <p className="text-xs text-muted-foreground">Install a supported coding agent such as Claude Code, Codex or another ACP agent, sign in, and restart Nora. Your draft stays here.</p>
      : resolution.status === "blocked" && resolution.message ? <p role="status" className="text-xs text-muted-foreground">{resolution.message}</p> : null}
  </div>;
}
