import { Select } from "@/components/ui/select";
import type { SubagentModelOptionProps } from "@/components/app/types/modelPicker.types";

/** Default model for subagents, for runtimes that accept one. Agents the model sends to a specific model keep that choice. */
export function NativeSubagentModelOption({ models, value, disabled, onChange }: SubagentModelOptionProps) {
  const selected = models.find((model) => model.id === value);
  return <div className="col-span-2 min-w-0 space-y-1.5"><p className="text-[11px] font-medium text-muted-foreground">Subagents</p>
    <Select aria-label="Subagent model" className="h-8 px-2.5 text-xs" value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
      <option value="">Use provider default</option>
      {value && !selected && <option value={value} disabled>{value} (unavailable)</option>}
      {models.map((model) => <option key={model.id} value={model.id}>{model.name || model.id}</option>)}
    </Select>
    <p className="text-[11px] leading-relaxed text-muted-foreground">{selected
      ? `Subagents run on ${selected.name || selected.id} unless an agent's definition or the model's own request names another.`
      : "Subagents use the agent's own setting, a configured default, or this thread's model."}</p>
  </div>;
}
