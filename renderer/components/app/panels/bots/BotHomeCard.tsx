import { MessageSquarePlus, Pencil } from "lucide-react";
import { AppMark } from "@/components/app/shared/AppMark";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { BOT_ORIGIN_LABELS } from "@/components/app/constants/botOrigins";
import type { BotHomeCardProps } from "@/components/app/types/botNavigation.types";

export function BotHomeCard({ item, onStart, onContinue, onEdit }: BotHomeCardProps) {
  const threads = item.threads.length;
  return <li className="flex flex-col gap-3 rounded-xl border bg-card p-4">
    <div className="flex items-start gap-3">
      {item.avatar ? <BotAvatar avatar={item.avatar} state={item.state} size={52} label={item.name} />
        : <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-muted"><AppMark className="size-7" /></span>}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2"><span className="truncate font-medium">{item.name}</span>
          <span className="shrink-0 rounded bg-muted px-1.5 text-[11px] text-muted-foreground">{BOT_ORIGIN_LABELS[item.origin]}</span></p>
        {item.role && <p className="truncate text-sm text-muted-foreground">{item.role}</p>}
        <p className="mt-1 truncate text-xs text-muted-foreground">{[item.model ?? (item.avatar ? null : "Uses each thread's model"), `${threads} ${threads === 1 ? "thread" : "threads"}`].filter(Boolean).join(" · ")}</p>
      </div>
      {onEdit && <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={`Edit ${item.name}`} tooltip="Edit" onClick={onEdit}>
        <Pencil className="size-3.5" aria-hidden="true" /></Button>}
    </div>
    <div className="mt-auto flex flex-wrap gap-2">
      <Button type="button" size="sm" className="gap-1.5" onClick={onStart}><MessageSquarePlus className="size-3.5" aria-hidden="true" />New thread</Button>
      {onContinue && <Button type="button" variant="ghost" size="sm" onClick={onContinue}>Continue latest</Button>}
    </div>
  </li>;
}
