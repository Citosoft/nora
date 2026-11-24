import { Check } from "lucide-react";
import type { ComposerSettingOptionProps } from "@/components/app/types/modelPicker.types";
import { cn } from "@/lib/utils";

export function ComposerSettingOption({ choice, selected, disabled, onSelect }: ComposerSettingOptionProps) {
  const { icon: Icon, caution } = choice;
  return <button type="button" role="menuitemradio" aria-checked={selected} disabled={disabled} onClick={onSelect}
    className={cn("flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent/70 focus-visible:bg-accent/70 disabled:pointer-events-none disabled:opacity-50",
      selected && "bg-accent/50", caution && "text-amber-600 dark:text-amber-400")}>
    <Icon className={cn("mt-0.5 size-4 shrink-0", !caution && "text-muted-foreground")} aria-hidden="true" />
    <span className="min-w-0 flex-1 space-y-0.5">
      <span className="block text-xs font-medium">{choice.label}</span>
      {choice.description && <span className={cn("block text-[12px] leading-snug", caution ? "opacity-90" : "text-muted-foreground")}>{choice.description}</span>}
    </span>
    <Check className={cn("mt-0.5 size-3.5 shrink-0", !selected && "invisible")} aria-hidden="true" />
  </button>;
}
