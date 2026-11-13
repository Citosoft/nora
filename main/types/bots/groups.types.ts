import type { BotDefinition, GroupDescriptor, GroupMember } from "@shared/types/bots/bots.types";
import type { BotConversationHost } from "./conversations.types";

/** Picks which members should answer a message nobody @mentioned; returns member names, possibly none. */
export type GroupRouter = (input: { message: string; members: readonly GroupMember[]; signal: AbortSignal }) => Promise<string[]>;
export interface GroupCoordinatorOptions {
  host: BotConversationHost;
  nextId(): string;
  now(): string;
  /** The member's current definition in the group's workspace, or null when it was removed or hidden. */
  bot(workspaceId: string, botId: string): BotDefinition | null;
  route: GroupRouter;
  replyTimeoutMs?: number;
}
export interface GroupSpeakerInput { message: string; group: GroupDescriptor; route: GroupRouter; signal: AbortSignal; }
/** Members to ask, in order; a notice explains an empty selection. */
export interface GroupSpeakerSelection { speakers: GroupMember[]; notice: string | null; }
export type { GroupDescriptor };
