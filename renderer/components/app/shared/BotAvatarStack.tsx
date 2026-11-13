import { BotAvatar } from "./BotAvatar";
import type { BotAvatarStackProps } from "@/components/app/types/botAvatar.types";

const SHOWN = 3;

/** Overlapping avatars for a group, with a count when there are more members than fit. */
export function BotAvatarStack({ members, size, label, className }: BotAvatarStackProps) {
  const extra = members.length - SHOWN;
  return <span role="img" aria-label={label} className={`flex shrink-0 items-center ${className ?? ""}`}>
    {members.slice(0, SHOWN).map((member, index) => <span key={member.botId} className={index ? "-ml-[35%]" : ""} style={{ zIndex: SHOWN - index }}>
      <BotAvatar avatar={member.avatar} size={size} /></span>)}
    {extra > 0 && <span aria-hidden="true" className="ml-0.5 text-[10px] tabular-nums text-muted-foreground">+{extra}</span>}
  </span>;
}
