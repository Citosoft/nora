import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";

/** Registered runtimes whose agent is enabled: the only providers Settings asks for a sign-in status. */
export function enabledAccountProviders(providers: readonly NativeProvider[], enabledToolIds: readonly string[]): NativeProvider[] {
  const enabled = new Set(enabledToolIds);
  return providers.filter((provider) => enabled.has(provider.kind));
}
