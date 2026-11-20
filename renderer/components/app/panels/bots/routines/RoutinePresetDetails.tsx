import { describeRoutineSchedule } from "@shared/bots/routines/describe";
import type { RoutinePresetDetailsProps } from "@/components/app/types/botRoutines.types";

export function RoutinePresetDetails({ template }: RoutinePresetDetailsProps) {
  return <details className="min-w-0 flex-1 text-sm">
    <summary className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="font-medium">{template.name}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{describeRoutineSchedule(template.schedule)} · {template.runIn === "chat" ? "Bot chat" : "Routine thread"}</span>
    </summary>
    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{template.instruction}</p>
  </details>;
}
