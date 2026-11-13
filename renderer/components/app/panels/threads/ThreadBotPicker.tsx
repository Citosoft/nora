import { useState } from "react";
import { Check, ChevronDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppMark } from "@/components/app/shared/AppMark";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { NORA_ASSISTANT } from "@/components/app/logic/botNavigation";
import type { ThreadBotChoiceProps, ThreadBotPickerProps } from "@/components/app/types/nativePanels.types";

const ORIGIN_LABELS = { global: null, shared: "Shared", private: "Private" } as const;

/** "Talk to" choice for a new thread; an existing thread shows the bot it runs as. */
export function ThreadBotPicker({ bots, current, currentState, selectedId, modelOverride, onUseBotModel, disabled, onSelect, onManage }: ThreadBotPickerProps) {
  const [open, setOpen] = useState(false);
  if (current) {
    return <span className="flex min-w-0 items-center gap-2 px-2 text-sm" title={modelOverride ? `${current.name} is using a different model than its saved one` : undefined}>
      <BotAvatar avatar={current.avatar} state={currentState} size={18} label={current.name} /><span className="truncate" aria-hidden="true">{current.name}</span>
      {modelOverride && <span className="shrink-0 text-xs text-muted-foreground">(model override)</span>}
      {modelOverride && onUseBotModel && <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={onUseBotModel}>
        Use {current.name}'s model</Button>}
    </span>;
  }
  if (!bots.length && !onManage) return null;
  const selected = bots.find((entry) => entry.bot.id === selectedId)?.bot ?? null;
  const choose = (botId: string | null): void => { onSelect(botId); setOpen(false); };
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild>
    <Button size="sm" variant="ghost" disabled={disabled} className="max-w-full gap-2 px-2 font-normal" aria-label={`Talk to ${selected?.name ?? "Nora"}`}>
      {selected ? <BotAvatar avatar={selected.avatar} size={18} /> : <AppMark className="size-3.5 shrink-0" />}
      <span className="truncate">{selected?.name ?? "Nora"}</span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent side="top" aria-label="Talk to" className="w-[min(23rem,calc(100vw-1.5rem))] bg-popover p-2">
      <h2 className="px-3 pb-2 pt-1 text-xs font-medium text-muted-foreground">Talk to</h2>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        <BotChoice selected={!selected} onSelect={() => choose(null)} icon={<AppMark className="size-5 shrink-0" />} name={NORA_ASSISTANT.name} detail={`${NORA_ASSISTANT.role} · can create bots`} />
        {bots.map(({ bot, origin }) => <BotChoice key={bot.id} selected={bot.id === selected?.id} onSelect={() => choose(bot.id)}
          icon={<BotAvatar avatar={bot.avatar} size={28} />} name={bot.name} detail={bot.role || `${bot.binding.model}`} badge={ORIGIN_LABELS[origin]} />)}
      </div>
      {onManage && <Button variant="ghost" size="sm" className="mt-1 w-full justify-start gap-2 font-normal text-muted-foreground" onClick={() => { setOpen(false); onManage(); }}>
        <Settings2 className="size-3.5" aria-hidden="true" />{bots.length ? "Manage bots" : "Create a bot"}</Button>}
    </PopoverContent>
  </Popover>;
}

function BotChoice({ selected, onSelect, icon, name, detail, badge }: ThreadBotChoiceProps) {
  return <button type="button" aria-pressed={selected} onClick={onSelect}
    className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "bg-secondary" : "hover:bg-muted"}`}>
    {icon}<span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm">{name}{badge && <span className="rounded bg-muted px-1.5 text-[11px] text-muted-foreground">{badge}</span>}</span>
      <span className="block truncate text-xs text-muted-foreground">{detail}</span></span>
    {selected && <Check className="size-4 shrink-0" aria-hidden="true" />}
  </button>;
}
