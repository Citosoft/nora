import { addressedMembers, membersByName } from "./speakers";
import type { GroupSpeakerInput, GroupSpeakerSelection } from "@main/types/bots/groups.types";

const ROUTED_SPEAKERS_MAX = 2;
const NO_ROUTER = "Nobody was @mentioned and Nora could not pick who should answer. @mention a member to get a reply.";
const NO_PICK = "Nobody picked this up. @mention a member to get a reply.";

/**
 * Who answers a user message, in order: the members it addresses (`@everyone` or @mentions) without asking a model, then the router's
 * pick of at most two, then the group's lead when the router cannot place it. Without a lead, an unplaced message gets a notice instead.
 */
export async function selectSpeakers({ message, group, route, signal }: GroupSpeakerInput): Promise<GroupSpeakerSelection> {
  const addressed = addressedMembers(message, group.members);
  if (addressed.length) return { speakers: addressed, notice: null };
  const names = await route({ message, members: group.members, signal }).catch(() => null);
  const routed = names ? membersByName(names, group.members, ROUTED_SPEAKERS_MAX) : [];
  if (routed.length) return { speakers: routed, notice: null };
  const lead = group.members.find((member) => member.botId === group.lead);
  if (lead) return { speakers: [lead], notice: null };
  return { speakers: [], notice: names === null ? NO_ROUTER : NO_PICK };
}
