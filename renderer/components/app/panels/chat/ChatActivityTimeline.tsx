import { CircleAlert, CircleCheck, CircleHelp, CircleStop, GitBranch, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ChatActivityKind, ChatActivityTimelineProps } from "@/components/app/types/chatActivity.types";

const ICONS: Record<ChatActivityKind, LucideIcon> = {
  started: GitBranch, completed: CircleCheck,
  failed: CircleAlert, interrupted: CircleStop, waiting: CircleHelp, notice: MessageSquare
};

/** Newest events first, with saved timestamps and links to the work behind each event. */
export function ChatActivityTimeline({ events, onOpenThread }: ChatActivityTimelineProps) {
  if (!events.length) return <p className="px-2 pb-2 text-xs text-muted-foreground">No activity yet.</p>;
  return <ol aria-label="Chat activity" className="ml-3 border-l border-border/60">{events.map((event) => {
    const Icon = ICONS[event.kind];
    const threadId = event.threadId;
    const description = event.detail ? `${event.title}\n${event.detail}` : event.title;
    return <li key={event.id} className="relative flex min-w-0 items-center gap-2 py-1.5 pl-4 pr-2 text-xs">
      <span className={`absolute -left-2 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center bg-background ${event.kind === "completed" ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
        <Icon aria-hidden="true" className="size-3" />
      </span>
      {threadId ? <button type="button" onClick={() => onOpenThread(threadId)}
        title={description} aria-label={description}
        className="min-w-0 flex-1 truncate rounded text-left hover:underline focus-visible:outline focus-visible:outline-ring">{event.title}</button>
        : <p title={description} className="min-w-0 flex-1 truncate">{event.title}</p>}
      <time dateTime={event.createdAt} title={new Date(event.createdAt).toLocaleString()} className="shrink-0 whitespace-nowrap text-[9px] text-muted-foreground">
        {new Date(event.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </time>
    </li>;
  })}</ol>;
}
