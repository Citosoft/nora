import { Select } from "@/components/ui/select";
import type { ModelOptionsProps } from "@/components/app/types/modelPicker.types";
import { NativeSubagentModelOption } from "./NativeSubagentModelOption";

export function NativeModelOptions({ catalog, model, policyId, reasoning, subagentModel, locked, onPolicy, onReasoning, onSubagentModel }: ModelOptionsProps) {
  const supportsReasoning = !!catalog?.capabilities.reasoning && !!model?.reasoningEfforts.length;
  const unavailable = !catalog || !model || catalog.authentication === "required";
  const policy = catalog?.policies.find((entry) => entry.id === policyId);
  return <section aria-label="Model settings" className="grid grid-cols-2 gap-3">
      <div className="min-w-0 space-y-1.5"><p className="text-[11px] font-medium text-muted-foreground">Permissions</p>
        <Select aria-label="Permissions" className="h-8 px-2.5 text-xs" value={policyId} disabled={locked || unavailable || !catalog?.policies.length} onChange={(event) => onPolicy(event.target.value)}>
          <option value="" disabled>Choose permissions</option>{catalog?.policies.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
        </Select>
        {policy?.description && <p className="text-[11px] leading-relaxed text-muted-foreground">{policy.description}</p>}
      </div>
      <div className="min-w-0 space-y-1.5"><p className="text-[11px] font-medium text-muted-foreground">Reasoning</p>
        <Select aria-label="Reasoning" className="h-8 px-2.5 text-xs" value={reasoning ?? ""} disabled={locked || unavailable || !supportsReasoning} onChange={(event) => onReasoning(event.target.value || null)}>
          <option value="">{unavailable ? "Choose a model" : supportsReasoning ? "Use provider settings" : "Not configurable"}</option>{supportsReasoning && model?.reasoningEfforts.map((effort) => <option key={effort} value={effort}>{effort}</option>)}
        </Select>
        {!unavailable && <p className="text-[11px] leading-relaxed text-muted-foreground">{supportsReasoning
          ? reasoning ? `Use the ${reasoning} reasoning level.` : "Use the provider's configured effort instead of overriding it here."
          : "This model does not expose a reasoning setting."}</p>}
      </div>
      {catalog?.capabilities.subagentModel && <NativeSubagentModelOption models={catalog.models} value={subagentModel} disabled={locked || unavailable} onChange={onSubagentModel} />}
  </section>;
}
