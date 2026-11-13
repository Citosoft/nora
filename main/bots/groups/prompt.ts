import type { Conversation, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { GroupMember } from "@shared/types/bots/bots.types";

const TRANSCRIPT_MAX_CHARS = 40_000;

/**
 * What a member sees: who is in the room and every message since it last spoke, newest last. Anything cut from the oldest end stays
 * reachable through the member's `group_history` tool, so the bound costs context, not information.
 */
export function groupPrompt(conversation: Conversation, members: readonly GroupMember[], member: GroupMember, items: readonly TimelineItem[]): string {
  const messages = items.filter((item): item is Extract<TimelineItem, { kind: "message" }> => item.kind === "message" && item.complete && !!item.text.trim());
  const lastOwn = messages.map((item) => item.author?.botId).lastIndexOf(member.botId);
  let transcript = messages.slice(lastOwn + 1).map((item) => `[${item.role === "user" ? "User" : item.author?.name ?? "Nora"}]: ${item.text}`).join("\n\n");
  if (transcript.length > TRANSCRIPT_MAX_CHARS) transcript = `[…earlier messages omitted; call group_history to read them]\n${transcript.slice(-TRANSCRIPT_MAX_CHARS)}`;
  const others = members.filter((entry) => entry.botId !== member.botId).map((entry) => `${entry.name}${entry.role ? ` (${entry.role})` : ""}`).join(", ");
  const lead = members.find((entry) => entry.botId === conversation.group?.lead);
  const leadNote = !lead ? "" : lead.botId === member.botId ? " You lead this group: when a message is unclear, answer it or say who should pick it up." : ` ${lead.name} leads this group.`;
  return `You are ${member.name} in the group chat "${conversation.title}" with the user and ${others}.${leadNote}\n\n`
    + `Messages since you last spoke:\n\n${transcript}\n\n`
    + `Reply as ${member.name} to the latest message. Be concise. @mention another member by name only if they should pick something up.`;
}
