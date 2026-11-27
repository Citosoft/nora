import { defaultNativeProvider, defaultNativeModelId } from "@shared/conversations/modelDefaults";
import type { ProviderModel } from "@shared/types/provider/catalog.types";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { ModelBindingInput, ModelCatalogState } from "@/components/app/types/modelPicker.types";
import type { ProviderBindingResolution } from "@shared/types/conversation/providerBinding.types";
import { resolveProviderBinding, selectedCatalogModel } from "@shared/conversations/providerBinding";

export function selectedNativeModel(catalog: ModelCatalogState, modelId: string | null): ProviderModel | null {
  return catalog.status === "idle" || catalog.status === "loading" ? null : selectedCatalogModel(catalog, modelId);
}

/** A new thread's provider before one is chosen: the configured default while it is installed, otherwise the first provider. */
export function inheritedNativeProvider(providers: readonly NativeProvider[], preferred: ThreadModelDefault | null): NativeProvider | null {
  return defaultNativeProvider(providers, preferred);
}

/** The configured default model while it belongs to this provider and is still offered; null inherits the catalog's first model. */
export function inheritedModelId(catalog: ModelCatalogState, provider: NativeProvider | null, preferred: ThreadModelDefault | null): string | null {
  if (!preferred || !provider || catalog.status !== "available" || nativeProviderKey(provider) !== nativeProviderKey(preferred)) return null;
  return defaultNativeModelId(catalog.catalog, preferred);
}

export function inheritedSubagentModel(catalog: ModelCatalogState, provider: NativeProvider | null, preferred: ThreadModelDefault | null): string | null {
  return catalog.status === "available" && catalog.catalog.capabilities.subagentModel ? inheritedModelId(catalog, provider, preferred) : null;
}

/** Waits while the catalog loads, then resolves exactly as the host-side importers do. */
export function resolveModelBinding(input: ModelBindingInput): ProviderBindingResolution {
  const { catalog } = input;
  if (catalog.status === "idle" || catalog.status === "loading") return { status: "blocked", message: null };
  return resolveProviderBinding({ ...input, catalog });
}

/** Explains when a model, permission or reasoning change takes effect, shared by the composer's pickers. */
export function bindingChangeHint(locked: boolean, continuation: boolean): string {
  if (locked) return "Use Change beside the model picker when the chat is idle.";
  return continuation ? "Changes apply with your next send in a fresh session with saved context." : "Settings apply to this new thread.";
}
