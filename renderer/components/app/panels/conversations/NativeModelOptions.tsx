import { useId } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import type { ModelOptionsProps } from "@/components/app/types/modelPicker.types";

export function NativeModelOptions({ catalog, model, policyId, reasoning, locked, onPolicy, onReasoning }: ModelOptionsProps) {
  const id = useId();
  const policy = catalog?.policies.find((entry) => entry.id === policyId);
  return <Popover><PopoverTrigger asChild><Button type="button" size="sm" variant="ghost" aria-label="Thread options" className="max-w-full gap-2 font-normal">
    <SlidersHorizontal className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate text-xs">{policy?.label ?? "Choose permissions"}</span>
  </Button></PopoverTrigger>
    <PopoverContent side="top" align="start" aria-label="Thread options" className="w-[min(20rem,calc(100vw-1.5rem))] space-y-4 bg-popover p-4">
      <h2 className="text-sm font-medium">Thread options</h2>
      <div className="space-y-1.5"><label htmlFor={`${id}-policy`} className="text-xs text-muted-foreground">Permissions</label>
        <Select id={`${id}-policy`} value={policyId} disabled={locked || !catalog?.policies.length} onChange={(event) => onPolicy(event.target.value)}>
          <option value="" disabled>Choose permissions</option>{catalog?.policies.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
        </Select>
      </div>
      {catalog?.capabilities.reasoning && !!model?.reasoningEfforts.length && <div className="space-y-1.5"><label htmlFor={`${id}-reasoning`} className="text-xs text-muted-foreground">Reasoning</label>
        <Select id={`${id}-reasoning`} value={reasoning ?? ""} disabled={locked} onChange={(event) => onReasoning(event.target.value || null)}>
          <option value="">Native default</option>{model.reasoningEfforts.map((effort) => <option key={effort} value={effort}>{effort}</option>)}
        </Select>
      </div>}
      {locked && <p className="text-xs text-muted-foreground">This thread keeps its saved execution settings. Start a new thread to change them.</p>}
    </PopoverContent>
  </Popover>;
}
