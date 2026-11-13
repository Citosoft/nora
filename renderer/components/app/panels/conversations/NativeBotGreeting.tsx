import { BotAvatar } from "@/components/app/shared/BotAvatar";
import type { ThreadBotGreetingProps } from "@/components/app/types/nativePanels.types";

/** Empty-state heading for a new thread with a bot, replacing the role greeting and starters. */
export function NativeBotGreeting({ bot, workspaceName }: ThreadBotGreetingProps) {
  return <div className="flex flex-col items-center gap-3">
    <BotAvatar avatar={bot.avatar} size={84} />
    {bot.role && <p className="text-xs font-medium text-muted-foreground">{bot.role}</p>}
    <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">What should <span className="text-primary">{bot.name}</span> work on in <span className="text-primary">{workspaceName}</span>?</h1>
  </div>;
}
