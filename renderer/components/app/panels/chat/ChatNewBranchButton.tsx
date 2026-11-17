import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import type { ChatNewBranchButtonProps } from "@/components/app/types/chatPanels.types";

/** Starts a blank branch: straight away in a direct chat, or with the member you pick in a group. */
export function ChatNewBranchButton({ participants, onNewBranch }: ChatNewBranchButtonProps) {
  const button = (label: string, onClick?: () => void) => <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label={label} title={label} onClick={onClick}>
    <Plus className="size-3.5" aria-hidden="true" /></Button>;
  if (participants.kind === "direct") return button(`New branch with ${participants.bot.name}`, () => onNewBranch(participants.bot.botId));
  return <DropdownMenu trigger={button("New branch with a member")} align="start">
    {participants.members.map((member) => <DropdownMenuItem key={member.botId} onSelect={() => onNewBranch(member.botId)}>
      <span className="flex items-center gap-2"><BotAvatar avatar={member.avatar} size={18} />{member.name}</span>
    </DropdownMenuItem>)}
  </DropdownMenu>;
}
