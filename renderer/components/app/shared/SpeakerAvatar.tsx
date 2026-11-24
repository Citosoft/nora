import { isNoraChat } from "@shared/bots/noraChat";
import { AppMark } from "./AppMark";
import { BotAvatar } from "./BotAvatar";
import type { SpeakerAvatarProps } from "@/components/app/types/botAvatar.types";

/** Who is speaking in a chat: Nora is the app itself, so it wears the app's mark instead of a generated face. */
export function SpeakerAvatar({ botId, size, label, className, ...avatar }: SpeakerAvatarProps) {
  if (!isNoraChat(botId)) return <BotAvatar {...avatar} size={size} {...(label ? { label } : {})} {...(className ? { className } : {})} />;
  return <span role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={`inline-flex shrink-0 ${className ?? ""}`}
    style={{ width: size, height: size }}><AppMark className="size-full" /></span>;
}
