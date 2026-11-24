import { defaultNativeModelId, defaultNativeProvider } from "@shared/conversations/modelDefaults";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { DefaultBindingInput, DefaultBindingResult } from "@main/types/execution/defaultBinding.types";

/**
 * The binding a thread started without a model choice runs on: the preferred provider and model when they are still available,
 * otherwise the first provider and its first model, with the provider's default permission policy.
 */
export async function defaultProviderBinding(input: DefaultBindingInput, workspace: WorkspaceRef): Promise<DefaultBindingResult> {
  const provider = defaultNativeProvider(input.providers, input.preferred);
  if (!provider) return { ok: false, message: "Choose a configured provider on this computer before starting a thread." };
  const result = await input.catalog(provider.kind, provider.instanceId, workspace);
  if (result.status !== "available") return { ok: false, message: result.failure.message };
  const catalog = result.catalog;
  const subagent = catalog.capabilities.subagentModel ? defaultNativeModelId(catalog, input.subagentModel) : null;
  return { ok: true, catalog, binding: { kind: provider.kind, instanceId: provider.instanceId,
    model: defaultNativeModelId(catalog, input.preferred) ?? catalog.models[0]?.id ?? "",
    permissionPolicy: catalog.policies[0]?.id ?? "", reasoning: null, ...(subagent ? { subagentModel: subagent } : {}) } };
}
