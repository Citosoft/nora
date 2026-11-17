import { Field } from "@/components/app/shared/Field";
import type { WorkflowLimitsFieldsProps } from "@/components/app/types/workflowSurface.types";
import { Input } from "@/components/ui/input";
import type { LoopLimitsDraft } from "@shared/loopLimits";

const LIMIT_FIELDS: readonly { key: keyof LoopLimitsDraft; label: string; min: number; max: number; hint: string }[] = [
  { key: "maxIterations", label: "Maximum iterations", min: 1, max: 100, hint: "1–100 writer and review cycles" },
  { key: "maxDurationMinutes", label: "Total runtime", min: 5, max: 1440, hint: "Minutes, 5–1440" },
  { key: "roleTimeoutMinutes", label: "Per-agent timeout", min: 1, max: 240, hint: "Minutes, 1–240" }
];

export function WorkflowLimitsFields({ value, onChange }: WorkflowLimitsFieldsProps) {
  return <div className="grid gap-4 sm:grid-cols-3">
    {LIMIT_FIELDS.map((field) => <Field key={field.key} label={field.label}>
      <Input type="number" min={field.min} max={field.max} value={value[field.key]}
        onChange={(event) => onChange({ ...value, [field.key]: Number(event.target.value) })} />
      <span className="text-xs font-normal text-muted-foreground">{field.hint}</span>
    </Field>)}
  </div>;
}
