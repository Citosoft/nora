import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { bindingChangeHint } from "@/components/app/logic/modelBinding";
import type { ComposerSettingPopoverProps } from "@/components/app/types/modelPicker.types";
import { cn } from "@/lib/utils";
import { ComposerSettingOption } from "./ComposerSettingOption";

const OPTION = "[role=menuitemradio]:not(:disabled)";

/** Arrow keys move between options, as in any menu; Tab still leaves the list. */
function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(OPTION));
  if (!options.length) return;
  event.preventDefault();
  const index = options.findIndex((option) => option === document.activeElement);
  const next = event.key === "ArrowDown" ? (index + 1) % options.length : (index - 1 + options.length) % options.length;
  options[next]?.focus();
}

/** A compact composer picker that lists each choice with an icon and a plain description of what it does. */
export function ComposerSettingPopover({ name, choices, selectedId, placeholder, disabled, locked, continuation, onSelect }: ComposerSettingPopoverProps) {
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const selected = choices.find((choice) => choice.id === selectedId);
  const label = selected?.label ?? placeholder;
  const Icon = selected?.icon ?? choices[0]?.icon;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" size="sm" variant="ghost" disabled={disabled}
      aria-label={`${name}: ${label}`} title={selected?.description ? `${label}: ${selected.description}` : label}
      className={cn("h-8 max-w-56 shrink-0 gap-1.5 px-2 font-normal", selected?.caution ? "text-amber-600 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-400" : "text-muted-foreground")}>
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      <span className="truncate text-xs">{label}</span>
      <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent side="top" align="start" className="w-[min(24rem,calc(100vw-1.5rem))] p-1.5"
      onOpenAutoFocus={(event) => {
        const target = list.current?.querySelector<HTMLButtonElement>(`[aria-checked=true]:not(:disabled)`) ?? list.current?.querySelector<HTMLButtonElement>(OPTION);
        if (target) { event.preventDefault(); target.focus(); }
      }}>
      <div ref={list} role="menu" aria-label={name} className="space-y-0.5" onKeyDown={moveFocus}>
        {choices.map((choice) => <ComposerSettingOption key={choice.id} choice={choice} selected={choice.id === selectedId} disabled={locked}
          onSelect={() => { onSelect(choice.id); setOpen(false); }} />)}
      </div>
      {(locked || continuation) && <p className="border-t px-3 pb-1 pt-2 text-[12px] text-muted-foreground">{bindingChangeHint(locked, continuation)}</p>}
    </PopoverContent>
  </Popover>;
}
