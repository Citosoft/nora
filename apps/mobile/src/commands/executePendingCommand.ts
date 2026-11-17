import type { CommandReceipt } from "@shared/types/conversation/contracts.types";
import type { CommandOutcome, PendingCommand, PendingCommandStore } from "@/types/pendingCommand.types";
import type { RuntimeClient } from "@/types/runtimeClient.types";
import { RemoteRequestError } from "@/api/http/remoteRequestError";

/** Codes after which resending the same command can succeed (auth refreshed, rate limit or pause lifted). */
const retryableCodes: ReadonlySet<string> = new Set(["unauthenticated", "rate-limited", "unavailable"]);

/** True when the runtime answered and refused the command, so resending it unchanged can never succeed. */
export function isDefinitiveRejection(error: RemoteRequestError): boolean {
  const failure = error.failure;
  if (failure.kind === "api") return !retryableCodes.has(failure.code);
  if (failure.kind === "http") return failure.status >= 400 && failure.status < 500 && ![401, 408, 429].includes(failure.status);
  return false;
}

/**
 * Sends a saved command with its saved IDs. The store entry is removed on receipt or definitive rejection and kept (with
 * the error) when the outcome is uncertain, so `retry` resends the identical command.
 */
export async function executePendingCommand(client: RuntimeClient, store: PendingCommandStore, command: PendingCommand): Promise<CommandOutcome> {
  if (!store.get(command.key)) await store.put(command);
  try {
    const receipt = await send(client, store, command);
    await store.remove(command.key);
    return { status: "accepted", receipt };
  } catch (error) {
    if (!(error instanceof RemoteRequestError)) throw error;
    if (isDefinitiveRejection(error)) {
      await store.remove(command.key);
      return { status: "rejected", error };
    }
    const latest = store.get(command.key) ?? command;
    await store.put({ ...latest, lastError: error.message });
    return { status: "uncertain", error };
  }
}

async function send(client: RuntimeClient, store: PendingCommandStore, command: PendingCommand): Promise<CommandReceipt> {
  switch (command.kind) {
    case "send-message":
      return client.sendMessage(command.conversationId, { commandId: command.commandId, runId: command.runId, instruction: command.instruction });
    case "create-conversation": {
      const saved = store.get(command.key);
      if (!(saved?.kind === "create-conversation" && saved.created)) {
        await client.createConversation({ commandId: command.commandId, conversationId: command.conversationId, projectId: command.projectId,
          title: command.title });
        await store.put({ ...command, created: true });
      }
      return client.sendMessage(command.conversationId, { commandId: command.message.commandId, runId: command.message.runId,
        instruction: command.message.instruction });
    }
    case "decide-action":
      return client.decideAction(command.requestId, { commandId: command.commandId, conversationId: command.conversationId, response: command.response });
    case "cancel-task":
      return client.cancelTask(command.runId, { commandId: command.commandId, conversationId: command.conversationId });
  }
}
