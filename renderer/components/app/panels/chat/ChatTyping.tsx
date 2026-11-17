import { BotAvatar } from "@/components/app/shared/BotAvatar";
import type { ChatTypingProps } from "@/components/app/types/chatPanels.types";

/** Shown while a bot is working on a reply, in place of its tool activity. */
export function ChatTyping({ name, avatar, workspaceName, waiting }: ChatTypingProps) {
  const text = waiting ? `${name} is waiting for you` : `${name} is working${workspaceName ? ` in ${workspaceName}` : ""}…`;
  return <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
    <BotAvatar avatar={avatar} state={waiting ? "waiting" : "thinking"} size={32} />
    <span className={waiting ? undefined : "text-shimmer"}>{text}</span>
  </div>;
}
