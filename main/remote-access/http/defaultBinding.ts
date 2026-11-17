import { defaultNativeProvider, defaultNativeModelId } from "@shared/conversations/modelDefaults";
import { providerBindingProblem } from "@shared/conversations/providerBinding";
import { threadPreferences } from "@shared/personalization/threads";
import type { ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { RuntimeApiOptions } from "@main/types/remote-access/http/runtime.types";
import { RuntimeFailure } from "./failure";

export async function remoteProviderBinding(options: RuntimeApiOptions, workspace: WorkspaceRef, requested?: ProviderBinding): Promise<ProviderBinding> {
  const boot = options.boot();
  const preferred = boot.personalization.threadModel ?? null;
  const provider = requested ? boot.providers.find((entry) => entry.kind === requested.kind && entry.instanceId === requested.instanceId)
    : defaultNativeProvider(boot.providers, preferred);
  if (!provider) throw new RuntimeFailure("unavailable", "Choose a configured provider on this computer before starting a thread.");
  const result = await options.host.catalog(provider.kind, provider.instanceId, workspace);
  if (result.status !== "available") throw new RuntimeFailure("unavailable", result.failure.message);
  const catalog = result.catalog;
  const subagent = catalog.capabilities.subagentModel ? defaultNativeModelId(catalog, threadPreferences(boot.personalization).subagentModel) : null;
  const binding = requested ?? { kind: provider.kind, instanceId: provider.instanceId,
    model: defaultNativeModelId(catalog, preferred) ?? catalog.models[0]?.id ?? "",
    permissionPolicy: catalog.policies[0]?.id ?? "", reasoning: null, ...(subagent ? { subagentModel: subagent } : {}) };
  if (binding.permissionPolicy !== catalog.policies[0]?.id) throw new RuntimeFailure("forbidden", "New remote threads use this provider’s default permission policy. Change an existing thread’s permissions on this computer.");
  const problem = providerBindingProblem(binding, catalog);
  if (problem) throw new RuntimeFailure("invalid", problem);
  return binding;
}
