import type { z } from "zod";
import { conversationChannels } from "@shared/conversations/gateway";
import { mcpRequestSchema } from "@shared/providers/mcp";
import { providerAccountRequestSchema } from "@shared/providers/account";
import { skillsRequestSchema } from "@shared/providers/skills";
import { conversationReply } from "@main/execution/gateway";
import { ExecutionCommandError } from "@main/execution/errors";
import type { ConversationHost, ConversationReplyValue, RegisterConversationDeps } from "@main/types/execution/gateway.types";

/** Provider connections and accounts belong to the owning execution host. */
export function registerProviderIpc(deps: RegisterConversationDeps): () => void {
  function handle<T extends { environmentId: string }>(channel: string, schema: z.ZodType<T>, run: (host: ConversationHost, request: T) => Promise<ConversationReplyValue>): void {
    deps.ipc.handle(channel, async (event, input) => {
      if (event.sender.isDestroyed() || !deps.isAllowedSender(event)) {
        return { ok: false, error: { code: "environment", message: "Provider access is unavailable for this window" } };
      }
      return conversationReply(schema, input, async (request) => {
        const host = deps.resolveHost(request.environmentId);
        if (!host || host.environmentId !== request.environmentId) {
          throw new ExecutionCommandError("environment", "The owning execution host is unavailable; reconnect to that environment");
        }
        return run(host, request);
      });
    });
  }
  handle(conversationChannels.mcp, mcpRequestSchema, async (host, request) => ({ kind: "mcp", result: await host.mcp(request) }));
  handle(conversationChannels.account, providerAccountRequestSchema, async (host, request) => ({ kind: "account", result: await host.account(request) }));
  handle(conversationChannels.skills, skillsRequestSchema, async (host, request) => ({ kind: "skills", result: await host.skills(request) }));
  return () => {
    deps.ipc.removeHandler(conversationChannels.mcp);
    deps.ipc.removeHandler(conversationChannels.account);
    deps.ipc.removeHandler(conversationChannels.skills);
  };
}
