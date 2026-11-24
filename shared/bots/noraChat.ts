import { findEffectiveBot, NORA_BOT_ID } from "./catalog";
import type { BotDefinition, BotSettings, ChatBotProfile, SharedBotSet } from "@shared/types/bots/bots.types";
import type { Personalization } from "@shared/types/personalization/roles.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";

/** Nora as a direct-chat partner: one chat for every workspace. Its avatar is only stored on the chat; the app shows Nora's mark instead. */
export const NORA_CHAT: Readonly<ChatBotProfile> = { id: NORA_BOT_ID, name: "Nora", role: "Your app assistant", avatar: { seed: 0 }, scope: { kind: "global" } };

export function isNoraChat(botId: string): boolean { return botId === NORA_BOT_ID; }

/** Extends a bot lookup to direct chats, where Nora is available in every workspace. */
export function chatBotFor(bot: (workspaceId: string, botId: string) => BotDefinition | null): (workspaceId: string, botId: string) => ChatBotProfile | null {
  return (workspaceId, botId) => isNoraChat(botId) ? NORA_CHAT : bot(workspaceId, botId);
}

/** The bot a direct chat in this workspace is with, Nora included. */
export function findChatBot(settings: BotSettings | undefined, workspaceId: string, shared: readonly SharedBotSet[], botId: string): ChatBotProfile | null {
  return chatBotFor((id, botIdToFind) => findEffectiveBot(settings, id, shared, botIdToFind))(workspaceId, botId);
}

/** The model Nora's chat starts work threads on: its own setting, else the new-thread default; null leaves the choice to the runtime. */
export function noraChatModel(personalization: Pick<Personalization, "noraChatModel" | "threadModel">): ThreadModelDefault | null {
  return personalization.noraChatModel ?? personalization.threadModel ?? null;
}
