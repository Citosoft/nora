import type { NativeDraftInput, NativeDraftIntent } from "@/components/app/types/nativeConversation.types";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";

export function createDraftIntent(input: NativeDraftInput, nextId: () => string): NativeDraftIntent {
  const conversationId = input.conversationId ?? nextId();
  let create: NativeDraftIntent["create"] = null;
  if (!input.conversationId) {
    if (!input.role) throw new Error("Choose your role before starting a thread.");
    create = { kind: "create", commandId: nextId(), conversationId, title: input.text.trim().slice(0, 100),
      ...(input.source ? { source: input.source } : {}), workspace: input.workspace.workspace, provider: input.provider, parentId: null, role: input.role };
  }
  return { create,
    submit: { kind: "submit", commandId: nextId(), conversationId, runId: nextId(), instruction: input.text.trim() } };
}

/** Save identities before IPC. Retrying a lost reply repeats the same durable command, never a new turn. */
export async function deliverDraftIntent(client: ConversationClient, intent: NativeDraftIntent): Promise<string> {
  if (intent.create) await client.execute(intent.create);
  await client.execute(intent.submit);
  return intent.submit.conversationId;
}
