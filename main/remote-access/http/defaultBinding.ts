import { providerBindingProblem } from "@shared/conversations/providerBinding";
import { threadPreferences } from "@shared/personalization/threads";
import { defaultProviderBinding } from "@main/execution/defaultBinding";
import type { ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";
import type { RuntimeApiOptions } from "@main/types/remote-access/http/runtime.types";
import { RuntimeFailure } from "./failure";

async function requestedCatalog(options: RuntimeApiOptions, workspace: WorkspaceRef, requested: ProviderBinding): Promise<ProviderCatalog> {
  const provider = options.boot().providers.find((entry) => entry.kind === requested.kind && entry.instanceId === requested.instanceId);
  if (!provider) throw new RuntimeFailure("unavailable", "Choose a configured provider on this computer before starting a thread.");
  const result = await options.host.catalog(provider.kind, provider.instanceId, workspace);
  if (result.status !== "available") throw new RuntimeFailure("unavailable", result.failure.message);
  return result.catalog;
}

export async function remoteProviderBinding(options: RuntimeApiOptions, workspace: WorkspaceRef, requested?: ProviderBinding): Promise<ProviderBinding> {
  const boot = options.boot();
  let binding: ProviderBinding;
  let catalog: ProviderCatalog;
  if (requested) { binding = requested; catalog = await requestedCatalog(options, workspace, requested); }
  else {
    const result = await defaultProviderBinding({ providers: boot.providers, catalog: (kind, instanceId, at) => options.host.catalog(kind, instanceId, at),
      preferred: boot.personalization.threadModel ?? null, subagentModel: threadPreferences(boot.personalization).subagentModel }, workspace);
    if (!result.ok) throw new RuntimeFailure("unavailable", result.message);
    ({ binding, catalog } = result);
  }
  const problem = providerBindingProblem(binding, catalog);
  if (problem) throw new RuntimeFailure("invalid", problem);
  return binding;
}
