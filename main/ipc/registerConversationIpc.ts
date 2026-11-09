import { conversationChannels, executeRequestSchema, readRequestSchema, unwatchRequestSchema, watchRequestSchema } from "@shared/conversations/gateway";
import type { ConversationGatewayReply } from "@shared/ipc/types/conversationGateway.types";
import type { ConversationInvocation, RegisterConversationDeps } from "@main/types/execution/gateway.types";
import { ConversationGateway, conversationReply } from "@main/execution/gateway";
import { ViewSubscriptions } from "@main/execution/viewSubscriptions";

/** Sole channel owner. Bootstrap installs it only with the complete v3 cutover. */
export function registerConversationIpc(deps: RegisterConversationDeps): () => void {
  const gateway = new ConversationGateway(deps);
  const subscriptions = new ViewSubscriptions(gateway);
  const allowed = (event: ConversationInvocation): boolean => !event.sender.isDestroyed() && deps.isAllowedSender(event);
  const forbidden = (): ConversationGatewayReply => ({ ok: false, error: { code: "environment", message: "Conversation access is unavailable for this window" } });
  deps.ipc.handle(conversationChannels.execute, async (event, input) => allowed(event)
    ? conversationReply(executeRequestSchema, input, async (request) => ({ kind: "receipt", receipt: await gateway.execute(request) })) : forbidden());
  deps.ipc.handle(conversationChannels.read, async (event, input) => allowed(event)
    ? conversationReply(readRequestSchema, input, (request) => gateway.read(request)) : forbidden());
  deps.ipc.handle(conversationChannels.watch, async (event, input) => allowed(event)
    ? conversationReply(watchRequestSchema, input, async (request) => {
      return { kind: "watch", receipt: subscriptions.watch(event.sender, request) };
    }) : forbidden());
  deps.ipc.handle(conversationChannels.unwatch, async (event, input) => allowed(event)
    ? conversationReply(unwatchRequestSchema, input, async (request) => {
      subscriptions.unwatch(event.sender.id, request); return { kind: "unwatched" };
    }) : forbidden());
  return () => {
    subscriptions.dispose();
    for (const channel of [conversationChannels.execute, conversationChannels.read, conversationChannels.watch, conversationChannels.unwatch]) deps.ipc.removeHandler(channel);
  };
}
