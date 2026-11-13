import { Bot, LoaderCircle } from "lucide-react";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import type { NativeAskBotCardProps } from "@/components/app/types/nativeActivity.types";

/** "Asked Rex": who was asked, what, and the answer, with a link to the asked bot's own thread where its work and approvals live. */
export function NativeAskBotCard({ call, bot, onOpenThread }: NativeAskBotCardProps) {
  const name = bot?.name ?? call.bot;
  const running = call.tool.state === "running";
  const status = running ? `Waiting for ${name}…` : call.error ? `${name} couldn't answer` : call.reply !== null ? `${name} replied` : `Asked ${name}`;
  return <article aria-label={`Asked ${name}`} className="rounded-lg border bg-card/60 px-4 py-3 text-sm">
    <div className="flex items-center gap-2">
      {bot ? <BotAvatar avatar={bot.avatar} state={running ? "thinking" : call.error ? "failed" : "idle"} size={24} /> : <Bot className="size-5 text-muted-foreground" aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate font-medium">{status}</span>
      {running && <LoaderCircle className="size-3.5 shrink-0 text-muted-foreground motion-safe:animate-spin" aria-hidden="true" />}
      {call.threadId && onOpenThread && <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => call.threadId && onOpenThread(call.threadId)}>
        Open {name}'s thread</Button>}
    </div>
    {call.message && <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-muted-foreground" title={call.message}>{call.message}</p>}
    {call.reply && <details className="mt-2"><summary className="cursor-pointer text-xs text-muted-foreground">Show {name}'s reply</summary>
      <MarkdownRenderer className="native-prose mt-2 min-w-0 break-words">{call.reply}</MarkdownRenderer></details>}
    {call.error && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-destructive">{call.error}</p>}
  </article>;
}
