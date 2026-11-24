import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ChatBotProfile } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";

/**
 * Where a bot's direct chat is stored. A workspace bot's chat lives in its workspace; a global bot's chat lives in Personal
 * (falling back to the workspace it was opened from), since it works in every workspace.
 */
export function directChatHome(boot: NativeBoot, bot: Pick<ChatBotProfile, "scope">, openedFrom: string): NativeWorkspace | null {
  const onHost = boot.workspaces.filter((entry) => entry.workspace.environmentId === boot.environmentId);
  if (bot.scope.kind === "workspace") { const scope = bot.scope; return onHost.find((entry) => entry.id === scope.workspaceId) ?? null; }
  return onHost.find((entry) => entry.kind === "personal") ?? onHost.find((entry) => entry.id === openedFrom) ?? null;
}

/** The bot's existing direct chat, settled or not; each bot has at most one. */
export function findDirectChat(summaries: readonly ConversationSummary[], bot: Pick<ChatBotProfile, "id" | "scope">): ConversationSummary | null {
  const workspaceId = bot.scope.kind === "workspace" ? bot.scope.workspaceId : null;
  return summaries.find(({ conversation }) => conversation.direct?.botId === bot.id
    && (conversation.direct.scope.kind === "workspace" ? conversation.direct.scope.workspaceId === workspaceId : !workspaceId)) ?? null;
}
