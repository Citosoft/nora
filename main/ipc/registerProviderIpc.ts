import { conversationChannels } from "@shared/conversations/gateway";
import { mcpRequestSchema } from "@shared/providers/mcp";
import { conversationReply } from "@main/execution/gateway";
import { ExecutionCommandError } from "@main/execution/errors";
import type { RegisterConversationDeps } from "@main/types/execution/gateway.types";

/** Provider connections belong to the selected workspace's execution host. */
export function registerProviderIpc(deps: RegisterConversationDeps): () => void {
  deps.ipc.handle(conversationChannels.mcp, async (event, input) => {
    if (event.sender.isDestroyed() || !deps.isAllowedSender(event)) {
      return { ok: false, error: { code: "environment", message: "Provider access is unavailable for this window" } };
    }
    return conversationReply(mcpRequestSchema, input, async (request) => {
      const host = deps.resolveHost(request.environmentId);
      if (!host || host.environmentId !== request.environmentId) {
        throw new ExecutionCommandError("environment", "The owning execution host is unavailable; reconnect to that environment");
      }
      return { kind: "mcp", result: await host.mcp(request) };
    });
  });
  return () => deps.ipc.removeHandler(conversationChannels.mcp);
}
