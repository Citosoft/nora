import { GROUP_EVERYONE_MENTION } from "@shared/bots/contracts";
import type { GroupMember } from "@shared/types/bots/bots.types";

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Members @mentioned in a message, in the order they first appear. */
export function mentionedMembers(text: string, members: readonly GroupMember[], exclude?: string): GroupMember[] {
  return members.filter((member) => member.botId !== exclude)
    .map((member) => ({ member, index: text.search(new RegExp(`@${escape(member.name)}(?![\\p{L}\\p{N}_])`, "iu")) }))
    .filter((entry) => entry.index >= 0).sort((a, b) => a.index - b.index).map((entry) => entry.member);
}

/** Who the user's message addresses: every member for `@everyone`, otherwise the members it @mentions. Members' replies can only @mention by name. */
export function addressedMembers(text: string, members: readonly GroupMember[]): GroupMember[] {
  return new RegExp(`@${GROUP_EVERYONE_MENTION}(?![\\p{L}\\p{N}_])`, "iu").test(text) ? [...members] : mentionedMembers(text, members);
}

/** Maps router output (names, in any case) back to members, dropping unknowns and duplicates. */
export function membersByName(names: readonly string[], members: readonly GroupMember[], limit: number): GroupMember[] {
  const chosen: GroupMember[] = [];
  for (const name of names) {
    const member = members.find((entry) => entry.name.toLocaleLowerCase() === name.trim().replace(/^@/, "").toLocaleLowerCase());
    if (member && !chosen.includes(member)) chosen.push(member);
  }
  return chosen.slice(0, limit);
}
