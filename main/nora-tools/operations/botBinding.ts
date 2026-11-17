import type { BotBinding } from "@shared/types/bots/bots.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { BotModelInput } from "@main/types/nora-tools/noraTools.types";
import type { BotBindingFallback, NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

/** Explicit provider/model is checked against the provider's catalog; otherwise the fallback (the thread's or the bot's own model) is kept. */
export async function resolveBotBinding(input: BotModelInput, fallback: BotBindingFallback, workspace: WorkspaceRef, options: NoraToolOperationOptions): Promise<BotBinding> {
  if (!input.provider && !input.model) return { ...fallback };
  const providers = options.boot().providers;
  const provider = input.provider
    ? providers.find((entry) => entry.instanceId === input.provider) ?? providers.find((entry) => entry.kind === input.provider)
    : providers.find((entry) => entry.kind === fallback.kind && entry.instanceId === fallback.instanceId);
  if (!provider) {
    if (!input.provider) return { ...fallback, model: input.model ?? fallback.model, reasoning: null };
    throw new Error(`No installed provider matches "${input.provider}". Available: ${providers.map((entry) => entry.kind).join(", ") || "none"}.`);
  }
  const sameProvider = provider.kind === fallback.kind && provider.instanceId === fallback.instanceId;
  const catalog = await options.host.catalog(provider.kind, provider.instanceId, workspace);
  const models = catalog.status === "available" ? catalog.catalog.models.map((model) => model.id) : null;
  const model = input.model ?? (sameProvider ? fallback.model : models?.[0]);
  if (!model) throw new Error(`Choose a model for ${provider.label}; its model list is unavailable right now.`);
  if (models && !models.includes(model)) throw new Error(`${provider.label} has no model "${model}". Available: ${models.slice(0, 12).join(", ")}.`);
  const keepsSettings = sameProvider && model === fallback.model;
  return { kind: provider.kind, instanceId: provider.instanceId, model,
    reasoning: keepsSettings ? fallback.reasoning : null, permissionPolicy: keepsSettings ? fallback.permissionPolicy : null };
}
