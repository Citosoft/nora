import { conversationChannels, cursorHintSchema, gatewayReplySchema } from "@shared/conversations/gateway";
import { ConversationAccessError } from "@shared/conversations/errors";
import type { ConversationBridge } from "@shared/ipc/types/conversationGateway.types";
import type { ConversationTransport } from "@main/types/execution/bridge.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

const incompatible = (): ConversationAccessError => new ConversationAccessError({ code: "unavailable", message: "Conversation transport returned an incompatible response; reconnect to the owning host" });

/** Validates normalized native conversation results; exposed when existing shell callers are migrated together. */
export function createConversationBridge(transport: ConversationTransport = {
  invoke: (channel, payload) => invokeIpc(channel, payload),
  onCursor: (listener) => subscribeToIpcEvent<unknown>(conversationChannels.cursor, listener)
}): ConversationBridge {
  const request = async (channel: string, payload: Parameters<ConversationTransport["invoke"]>[1]) => {
    let raw: unknown;
    try { raw = await transport.invoke(channel, payload); }
    catch { throw new ConversationAccessError({ code: "unavailable", message: "Conversation transport disconnected; reconnect to the owning host" }); }
    const reply = gatewayReplySchema.safeParse(raw);
    if (!reply.success) throw incompatible();
    if (!reply.data.ok) throw new ConversationAccessError(reply.data.error);
    return reply.data.value;
  };
  return {
    async mcp(input) { const value = await request(conversationChannels.mcp, input);
      if (value.kind !== "mcp") throw incompatible(); return value.result; },
    async account(input) { const value = await request(conversationChannels.account, input);
      if (value.kind !== "account") throw incompatible(); return value.result; },
    async execute(input) { const value = await request(conversationChannels.execute, input);
      // Importing an already-linked native session resolves to its existing Nora conversation.
      const importing = input.command.kind === "create" && !!input.command.externalSessionId;
      if (value.kind !== "receipt" || value.receipt.commandId !== input.command.commandId
        || (!importing && value.receipt.conversationId !== input.command.conversationId)) throw incompatible(); return value.receipt; },
    async read(input) { const value = await request(conversationChannels.read, input);
      if (value.kind !== input.kind) throw incompatible(); return value; },
    async watch(input) { const value = await request(conversationChannels.watch, input);
      if (value.kind !== "watch" || value.receipt.watchId !== input.watchId) throw incompatible(); return value.receipt; },
    async unwatch(input) { const value = await request(conversationChannels.unwatch, input);
      if (value.kind !== "unwatched") throw incompatible(); },
    onCursor(listener) { return transport.onCursor((payload) => {
      const hint = cursorHintSchema.safeParse(payload); if (hint.success) listener(hint.data);
    }); }
  };
}
