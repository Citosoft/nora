import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";

/** Desktop composers and remote starts inherit the same available provider and model. */
export function defaultNativeProvider(providers: readonly NativeProvider[], preferred: ThreadModelDefault | null): NativeProvider | null {
  return providers.find((provider) => provider.kind === preferred?.kind && provider.instanceId === preferred.instanceId) ?? providers[0] ?? null;
}
export function defaultNativeModelId(catalog: ProviderCatalog, preferred: ThreadModelDefault | null): string | null {
  return preferred && catalog.kind === preferred.kind && catalog.instanceId === preferred.instanceId
    && catalog.models.some((model) => model.id === preferred.model) ? preferred.model : null;
}
