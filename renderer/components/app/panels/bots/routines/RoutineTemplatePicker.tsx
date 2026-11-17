import { FilePlus2 } from "lucide-react";
import { describeRoutineSchedule } from "@shared/bots/routines/describe";
import { ROUTINE_TEMPLATES } from "@shared/bots/routines/templates";
import { cn } from "@/lib/utils";
import type { RoutineTemplatePickerProps } from "@/components/app/types/botRoutines.types";

const card = "flex h-full w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** A blank routine or one of the templates, as cards; picking one fills the later steps, which stay editable. */
export function RoutineTemplatePicker({ selectedId, disabled, onPick }: RoutineTemplatePickerProps) {
  const options = [{ id: null, name: "Blank routine", summary: "Write your own task and schedule.", schedule: null }, ...ROUTINE_TEMPLATES.map((template) =>
    ({ id: template.id, name: template.name, summary: template.summary, schedule: describeRoutineSchedule(template.schedule) }))];
  return <div role="radiogroup" aria-label="Start from" className="grid grid-cols-2 gap-2">
    {options.map((option) => {
      const selected = option.id === selectedId;
      return <button key={option.id ?? "blank"} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onPick(option.id)}
        className={cn(card, selected ? "border-primary bg-primary/5" : "hover:bg-muted/60")}>
        <span className="flex items-center gap-1.5 text-sm font-medium">{!option.id && <FilePlus2 className="size-3.5" aria-hidden="true" />}{option.name}</span>
        <span className="text-xs text-muted-foreground">{option.summary}</span>
        {option.schedule && <span className="text-xs text-muted-foreground/80">{option.schedule.replace(/^Once on .*/, "Once")}</span>}
      </button>;
    })}
  </div>;
}
