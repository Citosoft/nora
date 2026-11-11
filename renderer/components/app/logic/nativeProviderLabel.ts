import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";

/** The installed provider's display label for a conversation binding, falling back to its kind once the provider is gone. */
export function nativeProviderLabel(providers: readonly NativeProvider[], binding: Pick<ProviderBinding, "kind" | "instanceId">): string {
  return providers.find((provider) => provider.kind === binding.kind && provider.instanceId === binding.instanceId)?.label
    ?? providers.find((provider) => provider.kind === binding.kind)?.label ?? binding.kind;
}
