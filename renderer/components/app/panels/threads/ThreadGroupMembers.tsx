import { BotAvatarStack } from "@/components/app/shared/BotAvatarStack";
import { memberList } from "@/components/app/logic/botThreads";
import type { GroupMembersProps } from "@/components/app/types/nativePanels.types";

/** Composer chip for a group chat: who is in it, who may change files and who leads. */
export function ThreadGroupMembers({ members, writer, lead }: GroupMembersProps) {
  const names = memberList(members.map((member) => member.name));
  const writerName = members.find((member) => member.botId === writer)?.name;
  const leadName = members.find((member) => member.botId === lead)?.name;
  const title = [writerName ? `${writerName} can change files; the others read only.` : "Members can read but not change files.",
    leadName ? `${leadName} leads and answers messages nobody else picks up.` : null].filter(Boolean).join(" ");
  return <span className="flex min-w-0 items-center gap-2 px-2 text-sm" title={title}>
    <BotAvatarStack members={members} size={18} label={`Group: ${names}`} />
    <span className="truncate" aria-hidden="true">{names}</span>
  </span>;
}
