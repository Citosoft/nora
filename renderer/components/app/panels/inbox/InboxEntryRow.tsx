import { BellRing, CircleAlert, CircleCheck, CircleStop, Plug, Workflow } from "lucide-react";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { AppMark } from "@/components/app/shared/AppMark";
import { ThreadAge } from "@/components/app/panels/threads/ThreadAge";
import { Button } from "@/components/ui/button";
import { outcomeLabel, presentInboxEntry } from "@/components/app/logic/inbox/presentation";
import type { InboxEntryMarkProps, InboxEntryRowProps } from "@/components/app/types/inbox.types";
import { InboxItemMenu } from "./InboxItemMenu";

const TONE_CLASS = { default: "text-muted-foreground", warning: "text-amber-600 dark:text-amber-400", danger: "text-destructive" } as const;

function EntryMark({ item }: InboxEntryMarkProps) {
  if (item.kind === "outcome") return item.conversation.bot ? <BotAvatar avatar={item.conversation.bot.avatar} state={item.run.state === "failed" ? "failed" : "settled"} size={22} className="shrink-0" />
    : <span className="flex size-[22px] shrink-0 items-center justify-center"><AppMark className="size-4" /></span>;
  const Icon = item.kind === "workflow" ? Workflow : item.kind === "alert" ? BellRing : Plug;
  return <span className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted"><Icon className="size-3.5 text-muted-foreground" aria-hidden="true" /></span>;
}

function OutcomeIcon({ item }: InboxEntryMarkProps) {
  const label = outcomeLabel(item);
  if (!label || item.kind !== "outcome") return null;
  const Icon = item.run.state === "failed" ? CircleAlert : item.run.state === "interrupted" ? CircleStop : CircleCheck;
  const color = item.run.state === "failed" ? "text-destructive" : item.run.state === "interrupted" ? "text-muted-foreground" : "text-green-700 dark:text-green-400";
  return <Icon role="img" aria-label={label} className={`size-3.5 shrink-0 ${color}`} />;
}

/** A finished thread, a workflow run or a connector: who or what, the news beneath, opened by clicking anywhere on the row. */
export function InboxEntryRow({ item, now, actions }: InboxEntryRowProps) {
  const entry = presentInboxEntry(item);
  const unread = !item.readAt && item.kind !== "connector" && !(item.kind === "workflow" && item.status === "paused") && !(item.kind === "alert" && item.tier === "needs-you");
  return <li className="group flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40">
    <button type="button" data-inbox-row onClick={() => actions.open(item)} aria-label={`${entry.title}${unread ? ", unread" : ""}`}
      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <EntryMark item={item} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {unread && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />}
          <span className={`truncate text-[13px] ${unread ? "font-semibold" : "font-medium"}`} title={entry.title}>{entry.title}</span>
          <OutcomeIcon item={item} />
        </span>
        {entry.detail && <span className={`block truncate text-xs ${TONE_CLASS[entry.tone]}`} title={entry.detail}>{entry.detail}</span>}
      </span>
      <ThreadAge updatedAt={item.occurredAt} now={Date.parse(now)} />
    </button>
    {entry.actionLabel !== "Open" && <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => actions.open(item)}>{entry.actionLabel}</Button>}
    <InboxItemMenu item={item} now={now} actions={actions} />
  </li>;
}
