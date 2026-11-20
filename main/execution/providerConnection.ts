import { NORA_PROVIDER_KIND } from "@shared/providers/providerKinds";
import type { ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ProviderConnectionKind } from "@shared/types/provider/account.types";
import type { ProviderResolver } from "@main/types/execution/provider.types";

/** Capture a new thread's connection on the host; imports and unavailable reports cannot establish historical identity. */
export async function captureProviderConnection(providers: ProviderResolver, binding: ProviderBinding, workspace: WorkspaceRef, imported: boolean): Promise<ProviderConnectionKind> {
  if (imported || binding.kind === NORA_PROVIDER_KIND) return "unknown";
  try {
    const result = await providers.resolve(binding.kind, binding.instanceId).catalog(workspace);
    return result.status === "available" && result.catalog.kind === binding.kind && result.catalog.instanceId === binding.instanceId
      ? result.catalog.connection ?? "unknown" : "unknown";
  } catch { return "unknown"; }
}
