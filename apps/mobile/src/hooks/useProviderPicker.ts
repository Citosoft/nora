import { useState } from "react";
import { providerBindingProblem } from "@shared/conversations/providerBinding";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ProviderOptionsResponse } from "@shared/types/remote-access/runtimeApi.types";
import type { ProviderPickerChoice } from "@/types/providerPicker.types";
import type { RuntimeSession } from "@/types/runtimeSession.types";
import { useSessionResource } from "./useSessionResource";

const never = (): boolean => false;

export function useProviderPicker(session: RuntimeSession | null, projectId: string | null, enabled: boolean, initial: ProviderBinding | null = null) {
  const resource = useSessionResource<ProviderOptionsResponse>(enabled && projectId ? session : null,
    client => client.providerOptions(projectId!), { key: `providers/${projectId}`, isAffectedBy: never });
  const [choice, setChoice] = useState<ProviderPickerChoice | null>(null);
  const data = resource.state.status === "ready" ? resource.state.value : resource.state.status === "error" ? resource.state.stale : null;
  const providers = data?.providers.flatMap(entry => entry.result.status === "available" ? [{ label: entry.label, catalog: entry.result.catalog }] : []) ?? [];
  const value = choice?.projectId === projectId ? choice.binding : initial ?? data?.defaultBinding ?? null;
  const catalog = providers.find(entry => entry.catalog.kind === value?.kind && entry.catalog.instanceId === value?.instanceId)?.catalog;
  const unavailable = data?.providers.find(entry => entry.result.status === "unavailable")?.result;
  const emptyMessage = unavailable?.status === "unavailable" ? unavailable.failure.message : "No models are available. Check your provider setup on this computer.";
  const problem = !enabled ? null : resource.state.status === "loading" ? "Loading models…"
    : resource.state.status === "error" ? resource.state.message
    : !value || !catalog ? emptyMessage
    : providerBindingProblem(value, catalog);
  return { providers, value, problem, refresh: resource.refresh,
    onChange: (binding: ProviderBinding) => setChoice({ projectId, binding }) };
}
