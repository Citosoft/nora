import type { Conversation, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { GroupMember } from "@shared/types/bots/bots.types";
import { chatMessages, chatTranscript } from "@main/bots/chats/transcript";

/** What a member sees: who is in the room and every message since it last spoke, newest last. */
export function groupPrompt(conversation: Conversation, members: readonly GroupMember[], member: GroupMember, items: readonly TimelineItem[]): string {
  const messages = chatMessages(items);
  const transcript = chatTranscript(messages, messages.map((item) => item.author?.botId).lastIndexOf(member.botId));
  const others = members.filter((entry) => entry.botId !== member.botId).map((entry) => `${entry.name}${entry.role ? ` (${entry.role})` : ""}`).join(", ");
  const lead = members.find((entry) => entry.botId === conversation.group?.lead);
  const leadNote = !lead ? "" : lead.botId === member.botId ? " You lead this group: when a message is unclear, answer it or say who should pick it up." : ` ${lead.name} leads this group.`;
  return `You are ${member.name} in the group chat "${conversation.title}" with the user and ${others}.${leadNote}\n\n`
    + `Messages since you last spoke:\n\n${transcript}\n\n`
    + `Reply as ${member.name} to the latest message. Be concise. @mention another member by name only if they should pick something up.`;
}
