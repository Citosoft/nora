import type { ConversationBridge } from "@shared/ipc/types/conversationGateway.types";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import { listenToConversation } from "@/components/app/logic/listenToConversation";
import { ConversationAccessError } from "@shared/conversations/errors";

/** Inject a narrow bridge; renderer code never routes execution via the selected local project. */
export function createConversationClient(bridge: ConversationBridge, environmentId: string): ConversationClient {
  const route = { schemaVersion: 1 as const, environmentId };
  const incompatible = (): never => { throw new ConversationAccessError({ code: "unavailable", message: "Conversation response does not match the requested operation" }); };
  return {
    async externalSessions(providerKind, instanceId, workspace) {
      const value = await bridge.read({ ...route, kind: "external-sessions", providerKind, instanceId, workspace });
      return value.kind === "external-sessions" ? value.result : incompatible();
    },
    execute: (command) => bridge.execute({ ...route, command }),
    async header(conversationId) { const value = await bridge.read({ ...route, kind: "header", conversationId });
      return value.kind === "header" ? value.header : incompatible(); },
    async summaries(projectId) { const value = await bridge.read({ ...route, kind: "summaries", projectId });
      return value.kind === "summaries" ? value.summaries : incompatible(); },
    async history(query) { const value = await bridge.read({ ...route, ...query, kind: "history" });
      return value.kind === "history" ? value.page : incompatible(); },
    async catalog(providerKind, instanceId, workspace) { const value = await bridge.read({ ...route, kind: "catalog", providerKind, instanceId, workspace });
      return value.kind === "catalog" ? value.result : incompatible(); },
    subscribe: (listener) => listenToConversation(bridge, environmentId, listener)
  };
}
