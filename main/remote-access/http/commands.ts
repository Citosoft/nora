import { actionDecisionRequestSchema, cancelTaskRequestSchema, createBotChatRequestSchema, createConversationRequestSchema, sendMessageRequestSchema, commandResponseSchema } from "@shared/remote-access/runtimeApi";
import type { RemoteIdentity } from "@main/types/remote-access/auth.types";
import type { RuntimeApiOptions } from "@main/types/remote-access/http/runtime.types";
import type { RuntimeRoute } from "@main/types/remote-access/http/routes.types";
import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { RemoteAuditEntry } from "@shared/types/remote-access/remoteAccess.types";
import { RuntimeFailure, describeRuntimeFailure } from "./failure";
import { remoteProviderBinding } from "./defaultBinding";
import { requireRemoteConversation } from "./readRoutes";
import { botChatCommand } from "./botChats";

export async function executeRemoteCommand(options: RuntimeApiOptions, route: RuntimeRoute, body: unknown, identity: RemoteIdentity): Promise<Response> {
  let action: RemoteAuditEntry["action"] | null = null;
  let conversationId: string | null = null;
  let targetId: string | null = null;
  const record = (outcome: RemoteAuditEntry["outcome"], code: string | null): void => {
    if (!action) return;
    try { options.record({ at: new Date(options.now()).toISOString(), action, conversationId, targetId, outcome, code,
      userId: identity.userId, sessionId: identity.sessionId }); }
    catch { console.error("Remote activity could not be recorded."); }
  };
  try {
    let command: ConversationCommand;
    switch (route.kind) {
      case "create": {
        action = "create-conversation";
        const input = createConversationRequestSchema.parse(body);
        conversationId = input.conversationId;
        const workspace = options.boot().workspaces.find((entry) => entry.id === input.projectId)?.workspace;
        if (!workspace || workspace.environmentId !== options.host.environmentId) throw new RuntimeFailure("not-found", "Choose a workspace available on this runtime.");
        const previous = options.host.header(input.conversationId);
        const provider = await remoteProviderBinding(options, workspace, input.provider ?? previous?.conversation.provider);
        command = { kind: "create", commandId: input.commandId, conversationId: input.conversationId, title: input.title,
          workspace, provider, parentId: null };
        break;
      }
      case "bot-chat": {
        action = "create-conversation";
        const input = createBotChatRequestSchema.parse(body);
        conversationId = input.conversationId;
        command = botChatCommand(options.boot(), route.id, input);
        break;
      }
      case "send": {
        action = "send-message"; conversationId = route.id;
        const input = sendMessageRequestSchema.parse(body); targetId = input.runId;
        requireRemoteConversation(options, route.id);
        command = { ...input, kind: "submit", conversationId: route.id };
        break;
      }
      case "decision": {
        action = "decide-action"; targetId = route.id;
        const input = actionDecisionRequestSchema.parse(body); conversationId = input.conversationId;
        requireRemoteConversation(options, input.conversationId);
        // The execution host validates the live request, run, response kind and expiry, and deduplicates retries.
        command = { ...input, kind: "respond", requestId: route.id };
        break;
      }
      case "cancel": {
        action = "cancel-task"; targetId = route.id;
        const input = cancelTaskRequestSchema.parse(body); conversationId = input.conversationId;
        requireRemoteConversation(options, input.conversationId);
        command = { ...input, kind: "interrupt", runId: route.id };
        break;
      }
      default: throw new RuntimeFailure("not-found", "This runtime endpoint does not exist.");
    }
    if (!options.permits(identity) || identity.expiresAt <= options.now()) throw new RuntimeFailure("forbidden", "Remote access is no longer available.");
    const receipt = await options.host.execute(command);
    record("accepted", null);
    return Response.json(commandResponseSchema.parse({ receipt }));
  } catch (error) {
    record("rejected", describeRuntimeFailure(error).code);
    throw error;
  }
}
