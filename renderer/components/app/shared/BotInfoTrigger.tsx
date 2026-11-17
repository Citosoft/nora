import { useBotInfo } from "@/components/app/hooks/useBotInfo";
import { cn } from "@/lib/utils";
import type { BotInfoTriggerProps } from "@/components/app/types/botNavigation.types";

/** A bot's face or name that opens its info panel on click. */
export function BotInfoTrigger({ botId, name, className, children }: BotInfoTriggerProps) {
  const botInfo = useBotInfo();
  if (!botInfo) return <span className={className}>{children}</span>;
  return <button type="button" onClick={() => botInfo.show(botId)} aria-label={`${name} info`} title={`${name} info`}
    className={cn("rounded-md text-left hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
    {children}</button>;
}
