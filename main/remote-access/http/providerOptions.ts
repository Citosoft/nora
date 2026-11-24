import { providerOptionsQuerySchema, providerOptionsResponseSchema } from "@shared/remote-access/runtimeApi";
import { defaultProviderBinding } from "@main/execution/defaultBinding";
import { threadPreferences } from "@shared/personalization/threads";
import type { RuntimeApiOptions } from "@main/types/remote-access/http/runtime.types";
import { RuntimeFailure } from "./failure";

/** Catalogs are normalized by the execution host; no credentials or provider transport data cross this boundary. */
export async function readProviderOptions(options: RuntimeApiOptions, query: URLSearchParams): Promise<Response> {
  const { projectId } = providerOptionsQuerySchema.parse(Object.fromEntries(query));
  const boot = options.boot();
  const workspace = boot.workspaces.find(entry => entry.id === projectId)?.workspace;
  if (!workspace || workspace.environmentId !== options.host.environmentId) throw new RuntimeFailure("not-found", "Choose a workspace available on this runtime.");
  const providers = await Promise.all(boot.providers.map(async provider => ({
    label: provider.label, kind: provider.kind, instanceId: provider.instanceId,
    result: await options.host.catalog(provider.kind, provider.instanceId, workspace)
  })));
  const preferred = await defaultProviderBinding({ providers: boot.providers,
    preferred: boot.personalization.threadModel ?? null, subagentModel: threadPreferences(boot.personalization).subagentModel,
    catalog: async (kind, instanceId) => {
      const provider = providers.find(entry => entry.kind === kind && entry.instanceId === instanceId);
      if (!provider) throw new RuntimeFailure("unavailable", "This provider is no longer configured on this computer.");
      return provider.result;
    }
  }, workspace);
  return Response.json(providerOptionsResponseSchema.parse({ providers: providers.map(({ label, result }) => ({ label, result })),
    defaultBinding: preferred.ok ? preferred.binding : null }));
}
