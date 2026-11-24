import { ThinkingOrb } from "thinking-orbs";
import { SpeakerAvatar } from "@/components/app/shared/SpeakerAvatar";
import type { ChatTypingProps } from "@/components/app/types/chatPanels.types";

/**
 * Shown while a bot is working on a reply, in place of its tool activity.
 * A working bot shows a thinking orb; a waiting one shows its avatar, since the turn is now the user's.
 */
export function ChatTyping({ botId, name, avatar, workspaceName, waiting }: ChatTypingProps) {
  const text = waiting ? `${name} is waiting for you` : `${name} is working${workspaceName ? ` in ${workspaceName}` : ""}…`;
  return <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
    {waiting
      ? <SpeakerAvatar botId={botId} avatar={avatar} state="waiting" size={32} />
      : <ThinkingOrb state="working" size={32} aria-hidden className="shrink-0" />}
    <span className={waiting ? undefined : "text-shimmer"}>{text}</span>
  </div>;
}
