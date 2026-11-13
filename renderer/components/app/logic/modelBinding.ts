import type { ProviderModel } from "@shared/types/provider/catalog.types";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { ModelBindingInput, ModelBindingResolution, ModelCatalogState } from "@/components/app/types/modelPicker.types";
import { providerBindingProblem } from "@shared/conversations/providerBinding";

export function selectedNativeModel(catalog: ModelCatalogState, modelId: string | null): ProviderModel | null {
  if (catalog.status !== "available") return null;
  return modelId === null ? catalog.catalog.models[0] ?? null : catalog.catalog.models.find((model) => model.id === modelId) ?? null;
}

/** A new thread's provider before one is chosen: the configured default while it is installed, otherwise the first provider. */
export function inheritedNativeProvider(providers: readonly NativeProvider[], preferred: ThreadModelDefault | null): NativeProvider | null {
  const key = preferred ? nativeProviderKey(preferred) : null;
  return providers.find((provider) => nativeProviderKey(provider) === key) ?? providers[0] ?? null;
}

/** The configured default model while it belongs to this provider and is still offered; null inherits the catalog's first model. */
export function inheritedModelId(catalog: ModelCatalogState, provider: NativeProvider | null, preferred: ThreadModelDefault | null): string | null {
  if (!preferred || !provider || catalog.status !== "available" || nativeProviderKey(provider) !== nativeProviderKey(preferred)) return null;
  return catalog.catalog.models.some((model) => model.id === preferred.model) ? preferred.model : null;
}

export function inheritedSubagentModel(catalog: ModelCatalogState, provider: NativeProvider | null, preferred: ThreadModelDefault | null): string | null {
  return catalog.status === "available" && catalog.catalog.capabilities.subagentModel ? inheritedModelId(catalog, provider, preferred) : null;
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
  const model = selectedNativeModel(catalog, locked?.model ?? input.modelId);
  const policy = locked?.permissionPolicy ?? input.policyId;
  const reasoning = locked ? locked.reasoning : input.reasoning;
  const subagentModel = locked ? locked.subagentModel ?? null : input.subagentModel;
  const binding = locked ?? { kind: provider.kind, instanceId: provider.instanceId, model: model?.id ?? input.modelId ?? "", permissionPolicy: policy ?? "", reasoning,
    ...(subagentModel !== null ? { subagentModel } : {}) };
  const problem = providerBindingProblem(binding, catalog.catalog);
  return problem ? { status: "blocked", message: problem } : { status: "ready", binding };
}
