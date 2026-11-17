import { Eye, EyeOff, Pencil } from "lucide-react";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import type { BotListProps } from "@/components/app/types/botEditor.types";

const ORIGIN_LABELS = { global: "Everywhere", shared: "Shared", private: "Private" } as const;

export function BotList({ bots, emptyText, onEdit, hide }: BotListProps) {
  if (!bots.length) return <p className="py-3 text-sm text-muted-foreground">{emptyText}</p>;
  return <ul className="divide-y divide-border/60 rounded-md border border-border/60">
    {bots.map(({ bot, origin, overrides }) => {
      const hidden = hide?.hiddenIds.has(bot.id) ?? false;
      return <li key={`${origin}:${bot.id}`} className={`flex items-center gap-3 px-3 py-2.5 ${hidden ? "opacity-60" : ""}`}>
        <BotAvatar avatar={bot.avatar} size={36} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium"><span className="truncate">{bot.name}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 text-[11px] font-normal text-muted-foreground">{ORIGIN_LABELS[origin]}</span>
            {overrides.length > 0 && <span className="shrink-0 text-[11px] font-normal text-muted-foreground">overrides {overrides.map((entry) => ORIGIN_LABELS[entry].toLowerCase()).join(", ")}</span>}</p>
          <p className="truncate text-xs text-muted-foreground">{[bot.role, bot.binding.model].filter(Boolean).join(" · ")}</p>
        </div>
        {hide && <Button type="button" variant="ghost" size="sm" aria-pressed={hidden} onClick={() => hide.onToggle(bot.id, !hidden)}
          aria-label={hidden ? `Show ${bot.name} in this workspace` : `Hide ${bot.name} in this workspace`}>
          {hidden ? <EyeOff className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}{hidden ? "Hidden here" : "Shown here"}</Button>}
        <Button type="button" variant="ghost" size="sm" aria-label={`Edit ${bot.name}`} onClick={() => onEdit(bot)}><Pencil className="size-3.5" aria-hidden="true" />Edit</Button>
      </li>;
    })}
  </ul>;
}
