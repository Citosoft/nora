import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import { isProviderKind } from "@shared/providers/providerKinds";

/** Installed catalog agents that Nora can run but whose runtime the execution host has not registered yet. */
export function missingRuntimeProviders(installedToolIds: readonly string[], providers: readonly NativeProvider[]): string[] {
  const registered = new Set(providers.map((provider) => provider.kind));
  return installedToolIds.filter((id) => isProviderKind(id) && !registered.has(id)).sort();
}
