import { Info, MessageSquarePlus, Pencil } from "lucide-react";
import { AppMark } from "@/components/app/shared/AppMark";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { BOT_ORIGIN_LABELS } from "@/components/app/constants/botOrigins";
import type { BotHomeCardProps } from "@/components/app/types/botNavigation.types";
import { NORA_ASSISTANT } from "@/components/app/logic/botNavigation";

export function BotHomeCard({ item, onStart, onShowInfo, onEdit }: BotHomeCardProps) {
  const threads = item.threads.length;
  const face = item.avatar ? <BotAvatar avatar={item.avatar} state={item.state} size={52} label={item.name} />
    : <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-muted"><AppMark className="size-7" /></span>;
  return <li className="flex flex-col gap-3 rounded-lg border bg-card p-4">
    <div className="flex items-start gap-3">
      {onShowInfo ? <button type="button" onClick={onShowInfo} aria-label={`${item.name} info`}
        className="shrink-0 rounded-full hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{face}</button> : face}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2"><span className="truncate font-medium">{item.name}</span>
          <span className="shrink-0 rounded bg-muted px-1.5 text-[11px] text-muted-foreground">{BOT_ORIGIN_LABELS[item.origin]}</span></p>
        {item.role && <p className="truncate text-sm text-muted-foreground">{item.role}</p>}
        <p className="mt-1 truncate text-xs text-muted-foreground">{[item.model ?? (item.avatar ? null : "Uses each thread's model"), `${threads} ${threads === 1 ? "thread" : "threads"}`].filter(Boolean).join(" · ")}</p>
      </div>
      {onShowInfo && <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={`${item.name} info`} tooltip="Info" onClick={onShowInfo}>
        <Info className="size-3.5" aria-hidden="true" /></Button>}
      {onEdit && <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={`Edit ${item.name}`} tooltip="Edit" onClick={onEdit}>
        <Pencil className="size-3.5" aria-hidden="true" /></Button>}
    </div>
    <div className="mt-auto flex flex-wrap gap-2">
      <Button type="button" size="sm" className="gap-1.5" onClick={onStart}><MessageSquarePlus className="size-3.5" aria-hidden="true" />{item.id === NORA_ASSISTANT.id ? "New thread" : "Message"}</Button>
    </div>
  </li>;
}
