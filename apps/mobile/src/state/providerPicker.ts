import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";

/** Preserve compatible choices when changing models; reset provider-specific choices at the provider boundary. */
export function selectModel(catalog: ProviderCatalog, modelId: string, previous: ProviderBinding | null): ProviderBinding {
  const model = catalog.models.find(entry => entry.id === modelId);
  const sameProvider = previous?.kind === catalog.kind && previous.instanceId === catalog.instanceId;
  const reasoning = sameProvider && (previous.reasoning === null || model?.reasoningEfforts.includes(previous.reasoning))
    ? previous.reasoning : model?.defaultReasoningEffort ?? null;
  return { kind: catalog.kind, instanceId: catalog.instanceId, model: modelId,
    permissionPolicy: sameProvider && catalog.policies.some(entry => entry.id === previous.permissionPolicy)
      ? previous.permissionPolicy : catalog.policies[0]?.id ?? "",
    reasoning: catalog.capabilities.reasoning ? reasoning : null,
    ...(catalog.connection ? { connection: catalog.connection } : {}),
    ...(sameProvider && catalog.capabilities.subagentModel && previous.subagentModel && catalog.models.some(entry => entry.id === previous.subagentModel)
      ? { subagentModel: previous.subagentModel } : {}) };
}
