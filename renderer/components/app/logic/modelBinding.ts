import type { ProviderModel } from "@shared/types/provider/catalog.types";
import type { ModelBindingInput, ModelBindingResolution, ModelCatalogState } from "@/components/app/types/modelPicker.types";

export function selectedNativeModel(catalog: ModelCatalogState, modelId: string | null): ProviderModel | null {
  if (catalog.status !== "available") return null;
  return modelId === null ? catalog.catalog.models[0] ?? null : catalog.catalog.models.find((model) => model.id === modelId) ?? null;
}

/** No fallback for a removed explicit choice, a locked binding, or an unconfirmed permission selection. */
export function resolveModelBinding(input: ModelBindingInput): ModelBindingResolution {
  const { provider, catalog, locked } = input;
  if (!provider) return { status: "blocked", message: "Choose a configured provider before sending." };
  if (catalog.status === "idle" || catalog.status === "loading") return { status: "blocked", message: null };
  if (catalog.status === "unavailable") return { status: "blocked", message: catalog.failure.message };
  if (catalog.catalog.kind !== provider.kind || catalog.catalog.instanceId !== provider.instanceId
    || (locked && (locked.kind !== provider.kind || locked.instanceId !== provider.instanceId))) {
    return { status: "blocked", message: "The model catalog does not match this conversation's provider." };
  }
  if (catalog.catalog.authentication === "required") return { status: "blocked", message: "Sign in using this provider's CLI, then refresh its models. Your draft is preserved." };
  const model = selectedNativeModel(catalog, locked?.model ?? input.modelId);
  const policy = locked?.permissionPolicy ?? input.policyId;
  const reasoning = locked ? locked.reasoning : input.reasoning;
  const subagentModel = locked ? locked.subagentModel ?? null : input.subagentModel;
  if (!model) return { status: "blocked", message: catalog.catalog.models.length ? "The selected model is unavailable. Choose an available model before sending." : "This runtime has no available models." };
  if (!policy || !catalog.catalog.policies.some((entry) => entry.id === policy)) return { status: "blocked", message: "Choose a supported permission policy in the model picker before sending." };
  if (reasoning !== null && (!catalog.catalog.capabilities.reasoning || !model.reasoningEfforts.includes(reasoning))) return { status: "blocked", message: "The selected reasoning effort is unavailable for this model." };
  if (subagentModel !== null && (!catalog.catalog.capabilities.subagentModel || !catalog.catalog.models.some((entry) => entry.id === subagentModel))) {
    return { status: "blocked", message: "The selected subagent model is unavailable. Choose another in the model picker before sending." };
  }
  return { status: "ready", binding: locked ?? { kind: provider.kind, instanceId: provider.instanceId, model: model.id, permissionPolicy: policy, reasoning,
    ...(subagentModel !== null ? { subagentModel } : {}) } };
}
