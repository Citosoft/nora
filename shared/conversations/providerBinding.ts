import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalog, ProviderCatalogResult, ProviderModel } from "@shared/types/provider/catalog.types";
import type { ProviderBindingInput, ProviderBindingResolution } from "@shared/types/conversation/providerBinding.types";

export function sameProviderBinding(left: ProviderBinding, right: ProviderBinding): boolean {
  return left.kind === right.kind && left.instanceId === right.instanceId && left.model === right.model
    && left.permissionPolicy === right.permissionPolicy && left.reasoning === right.reasoning
    && left.subagentModel === right.subagentModel && (left.connection ?? "unknown") === (right.connection ?? "unknown");
}

/** Shared catalog validation for draft choices and host-side session transitions. */
export function providerBindingProblem(binding: ProviderBinding, catalog: ProviderCatalog): string | null {
  if (catalog.kind !== binding.kind || catalog.instanceId !== binding.instanceId) return "The model catalog does not match this conversation's provider.";
  if (catalog.authentication === "required") return "Sign in using this provider's CLI, then refresh its models. Your draft is preserved.";
  const model = catalog.models.find((entry) => entry.id === binding.model);
  if (!model) return catalog.models.length ? "The selected model is unavailable. Choose an available model before sending." : "This runtime has no available models.";
  if (!catalog.policies.some((entry) => entry.id === binding.permissionPolicy)) return "Choose a supported permission policy in the permissions picker before sending.";
  if (binding.reasoning !== null && (!catalog.capabilities.reasoning || !model.reasoningEfforts.includes(binding.reasoning))) return "The selected reasoning effort is unavailable for this model.";
  if (binding.subagentModel !== undefined && (!catalog.capabilities.subagentModel || !catalog.models.some((entry) => entry.id === binding.subagentModel))) return "The selected subagent model is unavailable. Choose another in the model picker before sending.";
  return null;
}

/** The chosen model, or the catalog's first model when none is chosen. */
export function selectedCatalogModel(catalog: ProviderCatalogResult, modelId: string | null): ProviderModel | null {
  if (catalog.status !== "available") return null;
  return modelId === null ? catalog.catalog.models[0] ?? null : catalog.catalog.models.find((model) => model.id === modelId) ?? null;
}

/** No fallback for a removed explicit choice, a locked binding, or an unconfirmed permission selection. */
export function resolveProviderBinding(input: ProviderBindingInput): ProviderBindingResolution {
  const { provider, catalog, locked } = input;
  if (!provider) return { status: "blocked", message: "Choose a configured provider before sending." };
  if (catalog.status === "unavailable") return { status: "blocked", message: catalog.failure.message };
  if (catalog.catalog.kind !== provider.kind || catalog.catalog.instanceId !== provider.instanceId
    || (locked && (locked.kind !== provider.kind || locked.instanceId !== provider.instanceId))) {
    return { status: "blocked", message: "The model catalog does not match this conversation's provider." };
  }
  const model = selectedCatalogModel(catalog, locked?.model ?? input.modelId);
  const policy = locked?.permissionPolicy ?? input.policyId;
  const reasoning = locked ? locked.reasoning : input.reasoning;
  const subagentModel = locked ? locked.subagentModel ?? null : input.subagentModel;
  const binding = locked ?? { ...(catalog.catalog.connection !== undefined ? { connection: catalog.catalog.connection } : {}), kind: provider.kind, instanceId: provider.instanceId, model: model?.id ?? input.modelId ?? "", permissionPolicy: policy ?? "", reasoning,
    ...(subagentModel !== null ? { subagentModel } : {}) };
  const problem = providerBindingProblem(binding, catalog.catalog);
  return problem ? { status: "blocked", message: problem } : { status: "ready", binding };
}
