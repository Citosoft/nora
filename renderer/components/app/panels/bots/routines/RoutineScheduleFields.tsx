import type { ReactNode } from "react";
import { ROUTINE_INTERVAL_UNITS, ROUTINE_MISSED_POLICIES } from "@shared/bots/routines/contracts";
import { ROUTINE_WEEKDAY_NAMES } from "@shared/bots/routines/describe";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ROUTINE_INTERVAL_UNIT_LABELS, ROUTINE_MISSED_POLICY_LABELS, ROUTINE_SCHEDULE_KIND_LABELS } from "@/components/app/constants/routineLabels";
import type { RoutineIntervalUnit, RoutineMissedPolicy, RoutineScheduleKind } from "@shared/types/bots/routines.types";
import type { RoutineScheduleFieldsProps } from "@/components/app/types/botRoutines.types";

const KINDS = Object.keys(ROUTINE_SCHEDULE_KIND_LABELS) as RoutineScheduleKind[];
const TIMEZONES = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
const label = "text-xs font-medium text-muted-foreground";
const integer = (value: string, fallback: number): number => Number.isFinite(Number.parseInt(value, 10)) ? Number.parseInt(value, 10) : fallback;

function Field({ title, children }: { title: string; children: ReactNode }) {
  return <label className="grid content-start gap-1"><span className={label}>{title}</span>{children}</label>;
}

/** The fields that follow "Repeats" for each schedule kind, laid out in the remaining two columns. */
function kindFields({ draft, onChange }: Pick<RoutineScheduleFieldsProps, "draft" | "onChange">): ReactNode {
  const time = <Field key="time" title="Time"><Input type="time" required value={draft.time} onChange={(event) => onChange({ time: event.target.value })} /></Field>;
  switch (draft.kind) {
    case "hourly": return <Field title="Minutes past the hour">
      <Input type="number" min={0} max={59} value={draft.minute} onChange={(event) => onChange({ minute: integer(event.target.value, 0) })} /></Field>;
    case "daily": case "weekdays": return time;
    case "weekly": return [<Field key="day" title="Day">
      <Select aria-label="Day of the week" value={String(draft.weekday)} onChange={(event) => onChange({ weekday: integer(event.target.value, 1) })}>
        {ROUTINE_WEEKDAY_NAMES.map((name, index) => <option key={name} value={String(index)}>{name}</option>)}
      </Select></Field>, time];
    case "monthly": return [<Field key="day" title="Day of the month">
      <Input type="number" min={1} max={31} value={draft.day} onChange={(event) => onChange({ day: integer(event.target.value, 1) })} /></Field>, time];
    case "interval": return [<Field key="amount" title="Every">
      <Input type="number" min={1} value={draft.amount} onChange={(event) => onChange({ amount: integer(event.target.value, 1) })} /></Field>,
    <Field key="unit" title="Unit">
      <Select aria-label="Interval unit" value={draft.unit} onChange={(event) => onChange({ unit: event.target.value as RoutineIntervalUnit })}>
        {ROUTINE_INTERVAL_UNITS.map((unit) => <option key={unit} value={unit}>{ROUTINE_INTERVAL_UNIT_LABELS[unit]}</option>)}
      </Select></Field>];
    case "custom": return <div className="col-span-2"><Field title="Cron expression">
      <Input value={draft.expression} required spellCheck={false} className="font-mono" placeholder="0 9 * * 1-5" onChange={(event) => onChange({ expression: event.target.value })} />
    </Field></div>;
    case "once": return [<Field key="date" title="Date">
      <Input type="date" required value={draft.date} onChange={(event) => onChange({ date: event.target.value })} /></Field>, time];
  }
}

function scheduleHint(kind: RoutineScheduleKind, day: number): string | null {
  if (kind === "custom") return "Five fields: minute, hour, day of month, month and weekday (0 is Sunday).";
  if (kind === "monthly" && day > 28) return `Months without day ${day} are skipped.`;
  if (kind === "interval") return "Counted from when you save, so it does not follow a timezone.";
  return null;
}

/** When the routine runs: a kind plus only the fields that kind uses, the clock it is read on, and what happens to missed runs. */
export function RoutineScheduleFields({ draft, disabled, onChange }: RoutineScheduleFieldsProps) {
  const hint = scheduleHint(draft.kind, draft.day);
  return <fieldset className="grid gap-4" disabled={disabled}>
    <legend className="sr-only">Schedule</legend>
    <div className="grid grid-cols-3 gap-3">
      <Field title="Repeats">
        <Select aria-label="Repeats" value={draft.kind} onChange={(event) => onChange({ kind: event.target.value as RoutineScheduleKind })}>
          {KINDS.map((kind) => <option key={kind} value={kind}>{ROUTINE_SCHEDULE_KIND_LABELS[kind]}</option>)}
        </Select></Field>
      {kindFields({ draft, onChange })}
    </div>
    {hint && <p className="-mt-2 text-xs text-muted-foreground">{hint}</p>}
    <div className="grid grid-cols-3 gap-3">
      {draft.kind !== "interval" && <Field title="Timezone">
        <Input value={draft.timezone} required list="routine-timezones" spellCheck={false} onChange={(event) => onChange({ timezone: event.target.value })} />
        <datalist id="routine-timezones">{TIMEZONES.map((zone) => <option key={zone} value={zone} />)}</datalist></Field>}
      {draft.kind !== "once" && <div className="col-span-2"><Field title="If Nora was closed when it was due">
        <Select aria-label="Missed runs" value={draft.missedPolicy} onChange={(event) => onChange({ missedPolicy: event.target.value as RoutineMissedPolicy })}>
          {ROUTINE_MISSED_POLICIES.map((policy) => <option key={policy} value={policy}>{ROUTINE_MISSED_POLICY_LABELS[policy]}</option>)}
        </Select></Field></div>}
    </div>
  </fieldset>;
}
