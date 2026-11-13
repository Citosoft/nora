import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ProviderCatalog } from "@shared/types/provider/catalog.types";

export function sameProviderBinding(left: ProviderBinding, right: ProviderBinding): boolean {
  return left.kind === right.kind && left.instanceId === right.instanceId && left.model === right.model
    && left.permissionPolicy === right.permissionPolicy && left.reasoning === right.reasoning
    && left.subagentModel === right.subagentModel;
}

/** Shared catalog validation for draft choices and host-side session transitions. */
export function providerBindingProblem(binding: ProviderBinding, catalog: ProviderCatalog): string | null {
  if (catalog.kind !== binding.kind || catalog.instanceId !== binding.instanceId) return "The model catalog does not match this conversation's provider.";
  if (catalog.authentication === "required") return "Sign in using this provider's CLI, then refresh its models. Your draft is preserved.";
  const model = catalog.models.find((entry) => entry.id === binding.model);
  if (!model) return catalog.models.length ? "The selected model is unavailable. Choose an available model before sending." : "This runtime has no available models.";
  if (!catalog.policies.some((entry) => entry.id === binding.permissionPolicy)) return "Choose a supported permission policy in the model picker before sending.";
  if (binding.reasoning !== null && (!catalog.capabilities.reasoning || !model.reasoningEfforts.includes(binding.reasoning))) return "The selected reasoning effort is unavailable for this model.";
  if (binding.subagentModel !== undefined && (!catalog.capabilities.subagentModel || !catalog.models.some((entry) => entry.id === binding.subagentModel))) return "The selected subagent model is unavailable. Choose another in the model picker before sending.";
  return null;
}
