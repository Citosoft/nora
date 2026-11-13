import { resolveModelBinding } from "@/components/app/logic/modelBinding";
import type { ThreadWorkspaceStore } from "@/components/app/types/thread-workspace/state.types";
import type { ThreadHandoffResult } from "@/components/app/types/thread-workspace/handoff.types";

/** Explicit sends use the same persistence, retry and queue path as the composer. */
export async function handoffThread(store: ThreadWorkspaceStore, conversationId: string, text: string): Promise<ThreadHandoffResult> {
  const id = store.openThread(conversationId);
  if (!id) throw new Error("This thread is unavailable on its execution host.");
  const document = store.snapshot().layout.documents.find((entry) => entry.id === id);
  if (!document || document.pending || store.snapshot().runtime[id]?.busy) throw new Error("Confirm the pending instruction before adding another handoff.");
  if (document.text.trim() || document.attachments?.length || document.threadReferences?.length) {
    store.setText(id, `${document.text}\n\n${text}`);
    return { kind: "draft", reason: "Context was added to the existing draft for review." };
  }
  store.setText(id, text);
  const header = await store.client.header(conversationId);
  if (!header || header.conversation.archivedAt) throw new Error("This thread is unavailable or settled. The context is retained as a draft.");
  const provider = header.conversation.provider;
  const catalog = await store.client.catalog(provider.kind, provider.instanceId, header.conversation.workspace);
  const resolution = resolveModelBinding({ provider, catalog, locked: provider,
    modelId: provider.model, policyId: provider.permissionPolicy, reasoning: provider.reasoning, subagentModel: provider.subagentModel ?? null });
  if (resolution.status !== "ready") return { kind: "draft", reason: resolution.message ?? "The model is unavailable; the context is retained as a draft." };
  store.setBinding(id, resolution.binding, "chosen");
  await store.submit(id);
  const pending = store.snapshot().layout.documents.find((entry) => entry.id === id)?.pending;
  if (pending) throw new Error("Delivery is unconfirmed. Retry the saved instruction in the thread.");
  const error = store.snapshot().runtime[id]?.error;
  if (error || store.snapshot().storageError) throw new Error(error ?? store.snapshot().storageError ?? "The handoff could not be saved.");
  return { kind: "accepted" };
}
