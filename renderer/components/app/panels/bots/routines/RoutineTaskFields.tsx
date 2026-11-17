import { ROUTINE_INSTRUCTION_MAX, ROUTINE_NAME_MAX } from "@shared/bots/routines/contracts";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RoutineTaskFieldsProps } from "@/components/app/types/botRoutines.types";

const label = "text-xs font-medium text-muted-foreground";

/** What the routine is called and what the bot is asked to do on each run. */
export function RoutineTaskFields({ draft, disabled, botName, onChange }: RoutineTaskFieldsProps) {
  return <div className="grid gap-3">
    <label className="grid gap-1"><span className={label}>Name</span>
      <Input value={draft.name} required maxLength={ROUTINE_NAME_MAX} placeholder="Morning triage" autoFocus disabled={disabled}
        onChange={(event) => onChange({ name: event.target.value })} /></label>
    <label className="grid gap-1"><span className={label}>What should {botName} do?</span>
      <Textarea value={draft.instruction} required rows={6} maxLength={ROUTINE_INSTRUCTION_MAX} disabled={disabled}
        placeholder="Summarise yesterday's open pull requests and flag anything blocked." onChange={(event) => onChange({ instruction: event.target.value })} /></label>
  </div>;
}
