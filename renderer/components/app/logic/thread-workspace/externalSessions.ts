import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import { effectiveRole } from "@shared/personalization/profiles";
import { resolveModelBinding } from "@/components/app/logic/modelBinding";
import type { ThreadWorkspaceStore, ThreadWorkspaceDeps } from "@/components/app/types/thread-workspace/state.types";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";

/** Import is a create-only operation: the first new instruction is sent separately by the normal composer. */
export async function adoptExternalSession(deps: ThreadWorkspaceDeps, boot: NativeBoot, workspaceId: string, session: ExternalSession): Promise<string> {
  const workspace = boot.workspaces.find((entry) => entry.id === workspaceId);
  if (!workspace) throw new Error("The external conversation's workspace is unavailable.");
  const provider = boot.providers.find((entry) => entry.kind === session.providerKind && entry.instanceId === session.instanceId);
  if (!provider) throw new Error("The external conversation's provider is unavailable.");
  const catalog = await deps.client.catalog(provider.kind, provider.instanceId, workspace.workspace);
  const policyId = catalog.status === "available" ? catalog.catalog.policies[0]?.id ?? null : null;
  const resolution = resolveModelBinding({ provider, catalog, locked: null, modelId: null, policyId, reasoning: null, subagentModel: null });
  if (resolution.status !== "ready") throw new Error(resolution.message ?? "Choose a ready provider before opening this external conversation.");
  const role = effectiveRole(boot.personalization, workspaceId);
  const receipt = await deps.client.execute({ kind: "create", commandId: deps.nextId(), conversationId: deps.nextId(),
    externalSessionId: session.id, title: session.title, workspace: workspace.workspace, provider: resolution.binding,
    parentId: null, ...(role ? { role } : {}) });
  return receipt.conversationId;
}

export async function importExternalSession(deps: ThreadWorkspaceDeps, store: ThreadWorkspaceStore, workspaceId: string, session: ExternalSession): Promise<void> {
  const conversationId = await adoptExternalSession(deps, store.snapshot().boot, workspaceId, session);
  await store.refresh();
  store.openThread(conversationId);
}

/** Pinning imports the conversation like opening does, but leaves the current view alone. */
export async function pinExternalSession(deps: ThreadWorkspaceDeps, store: ThreadWorkspaceStore, workspaceId: string, session: ExternalSession): Promise<void> {
  const conversationId = await adoptExternalSession(deps, store.snapshot().boot, workspaceId, session);
  // Pin before the list refreshes so the imported thread lands directly in Pinned.
  store.setPinned(conversationId, true);
  await store.refresh();
}
