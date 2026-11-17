import { GitBranch, ListTodo, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { chatBranchStatus, formatChatMoment } from "@/components/app/logic/chatBranchInfo";
import type { ChatBranchInfoPanelProps } from "@/components/app/types/chatPanels.types";

/**
 * Beside a branch or task tab: where it came from in the main chat, who it is with and where it works.
 * A branch shows the message it was started from as saved then, so it stays readable after the chat moves on.
 */
export function ChatBranchInfoPanel({ target, bot, model, onOpenThread }: ChatBranchInfoPanelProps) {
  const thread = target.kind === "thread" ? target.thread : null;
  const branch = thread ? thread.branch : { from: target.kind === "draft" ? target.draft.from : null };
  const from = branch?.from ?? null;
  const title = thread?.title ?? (target.kind === "draft" ? target.draft.title : null);
  const rows = [
    ["Status", chatBranchStatus(target)],
    ["Workspace", thread?.workspaceName ?? "Where the chat is working"],
    ["Model", model ?? `${bot.name}'s own`],
    ["Started", thread ? formatChatMoment(thread.createdAt) : "When you send the first message"]
  ] as const;
  return <aside aria-label={branch ? "Branch details" : "Task details"} className="thin-scrollbar hidden w-72 shrink-0 overflow-y-auto border-l px-4 py-4 text-xs md:block">
    <p className="flex items-center gap-1.5 font-medium">{branch ? <GitBranch className="size-3.5" aria-hidden="true" /> : <ListTodo className="size-3.5" aria-hidden="true" />}
      {branch ? "Branch" : "Task"}</p>
    {title && <p className="mt-1 break-words text-sm font-semibold">{title}</p>}
    <section className="mt-4 space-y-2" aria-label="Where it came from">
      <p className="font-medium text-muted-foreground">{branch ? "Branched from" : "Started by"}</p>
      {from ? <figure className="space-y-1.5 rounded-lg border bg-muted/40 p-3">
          <figcaption className="flex items-baseline justify-between gap-2"><span className="font-medium">{from.authorName ?? "You"}</span>
            <time className="text-muted-foreground" dateTime={from.createdAt}>{formatChatMoment(from.createdAt)}</time></figcaption>
          <blockquote className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[13px] leading-snug">{from.excerpt}</blockquote>
        </figure>
        : <p className="text-muted-foreground">{branch ? "A blank branch: it started with none of the main chat's context." : "The main chat, for a task you asked for there. The chat passes it the messages meant for it."}</p>}
      {branch && <p className="text-muted-foreground">Nothing said here goes back to the main chat, and the chat never sends its messages here.</p>}
    </section>
    <dl className="mt-4 space-y-2 border-t pt-4">
      <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">With</dt>
        <dd className="flex min-w-0 items-center gap-1.5"><BotAvatar avatar={bot.avatar} size={16} /><span className="truncate">{bot.name}</span></dd></div>
      {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-2"><dt className="shrink-0 text-muted-foreground">{label}</dt>
        <dd className="min-w-0 truncate text-right" title={value}>{value}</dd></div>)}
    </dl>
    {thread && <Button type="button" variant="outline" size="sm" className="mt-4 w-full gap-1.5" onClick={() => onOpenThread(thread.id)}>
      <SquareArrowOutUpRight className="size-3.5" aria-hidden="true" />Open full thread</Button>}
  </aside>;
}
