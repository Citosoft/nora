import { inheritedModelId, inheritedNativeProvider, inheritedSubagentModel, resolveModelBinding } from "@/components/app/logic/modelBinding";
import type { OpenThreadDraft, ThreadWorkspaceStore } from "@/components/app/types/thread-workspace/state.types";
import { threadPreferences } from "@shared/personalization/threads";

/** Explicit starts resolve their model without waiting for the composer to mount. */
export async function launchThreadDraft(store: ThreadWorkspaceStore, input: OpenThreadDraft, submit = false): Promise<string | null> {
  const id = store.openDraft(input);
  if (!id || !submit) return id;

  const { boot } = store.snapshot();
  const workspace = boot.workspaces.find((entry) => entry.id === input.workspaceId);
  if (!workspace) throw new Error("The task workspace is unavailable. Your draft has been retained.");
  const provider = input.provider
    ? boot.providers.find((entry) => entry.kind === input.provider?.kind && entry.instanceId === input.provider.instanceId)
    : inheritedNativeProvider(boot.providers, boot.personalization.threadModel ?? null);
  if (!provider) throw new Error("Choose a configured provider before starting. Your draft has been retained.");
  const catalog = await store.client.catalog(provider.kind, provider.instanceId, workspace.workspace);
  const resolution = resolveModelBinding({
    provider,
    catalog,
    locked: input.provider ?? null,
    modelId: inheritedModelId(catalog, provider, boot.personalization.threadModel ?? null),
    policyId: catalog.status === "available" ? catalog.catalog.policies[0]?.id ?? null : null,
    reasoning: null,
    subagentModel: inheritedSubagentModel(catalog, provider, threadPreferences(boot.personalization).subagentModel)
  });
  if (resolution.status !== "ready") throw new Error(resolution.message ?? "Choose a ready model before starting. Your draft has been retained.");
  store.setBinding(id, resolution.binding, input.provider ? "chosen" : "inherited");
  await store.submit(id);
  const state = store.snapshot();
  const error = state.runtime[id]?.error ?? state.storageError;
  if (error) throw new Error(error);
  const document = state.layout.documents.find((entry) => entry.id === id);
  if (document?.pending) throw new Error("Delivery is unconfirmed. Retry the saved instruction in the thread.");
  if (document?.target.kind !== "thread") throw new Error("The thread could not be started. Your draft has been retained.");
  return id;
}
