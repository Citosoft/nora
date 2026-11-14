import type { NativeDraftInput, NativeDraftIntent } from "@/components/app/types/nativeConversation.types";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import { sameProviderBinding } from "@shared/conversations/providerBinding";

export function createDraftIntent(input: NativeDraftInput, nextId: () => string): NativeDraftIntent {
  const conversationId = input.conversationId ?? nextId();
  let create: NativeDraftIntent["create"] = null;
  if (!input.conversationId) {
    if (!input.role) throw new Error("Choose your role before starting a thread.");
    const direct = input.direct;
    create = { kind: "create", commandId: nextId(), conversationId, title: direct ? direct.title : input.text.trim().slice(0, 100),
      ...(input.source ? { source: input.source } : {}), workspace: direct ? direct.home.workspace : input.workspace.workspace, provider: input.provider, parentId: null,
      // Chats carry their bots' guidance (in their work threads) instead of the user's role.
      ...(input.group ? { group: input.group } : direct ? { direct: direct.request } : { role: input.role }) };
  }
  return { create,
    submit: { kind: "submit", commandId: nextId(), conversationId, runId: nextId(), instruction: input.text.trim(),
      ...(input.conversationId && input.currentProvider && !sameProviderBinding(input.currentProvider, input.provider)
        ? { providerChange: { expected: input.currentProvider, next: input.provider } } : {}) } };
}

/** Save identities before IPC. Retrying a lost reply repeats the same durable command, never a new turn. */
export async function deliverDraftIntent(client: ConversationClient, intent: NativeDraftIntent): Promise<string> {
  if (intent.create) await client.execute(intent.create);
  await client.execute(intent.submit);
  return intent.submit.conversationId;
}
