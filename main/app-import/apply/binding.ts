import { resolveProviderBinding } from "@shared/conversations/providerBinding";
import { defaultNativeProvider } from "@shared/conversations/modelDefaults";
import type { NativeBoot, NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { AppImportProviderRef } from "@shared/types/app-import/appImportPlan.types";
import type { ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { AppImportApplyDeps } from "@main/types/app-import/appImportApply.types";

export type AppImportBindingResult = { status: "ready"; binding: ProviderBinding } | { status: "blocked"; message: string };

export interface AppImportBindingRequest {
  /** The provider the source used; null when it didn't say. */
  provider: AppImportProviderRef | null;
  model: string | null;
  /** Whether another provider will do when the source's own isn't set up (not for resumable sessions). */
  allowFallback: boolean;
}

/**
 * The source's own provider and model when Nora has them, else the default provider and its first model.
 * The default is skipped when the item must keep its provider, e.g. a session only that provider can resume.
 */
export async function resolveImportBinding(request: AppImportBindingRequest, boot: NativeBoot, workspace: WorkspaceRef, deps: Pick<AppImportApplyDeps, "conversations">): Promise<AppImportBindingResult> {
  const sourceProvider = request.provider;
  const own = !sourceProvider || sourceProvider.provider === "other" ? undefined : boot.providers.find((provider) => provider.kind === sourceProvider.provider);
  const fallback = request.allowFallback ? defaultNativeProvider(boot.providers, boot.personalization.threadModel ?? null) : null;
  const candidates = [own, fallback].filter((provider, index, all): provider is NativeProvider => !!provider && all.indexOf(provider) === index);
  let message = sourceProvider ? `Nora can't run ${sourceProvider.sourceProvider}. Set up Claude or Codex first.` : "Set up Claude or Codex first.";
  for (const provider of candidates) {
    const catalog = await deps.conversations.catalog(provider.kind, provider.instanceId, workspace);
    const offered = catalog.status === "available" ? catalog.catalog : null;
    const modelId = provider === own && request.model && offered?.models.some((model) => model.id === request.model) ? request.model : null;
    const resolution = resolveProviderBinding({ provider, catalog, locked: null, modelId, policyId: offered?.policies[0]?.id ?? null, reasoning: null, subagentModel: null });
    if (resolution.status === "ready") return resolution;
    message = resolution.message ?? message;
  }
  return { status: "blocked", message };
}
