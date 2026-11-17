import { ROUTINE_RUN_PLACES } from "@shared/bots/routines/contracts";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ROUTINE_RUN_PLACE_LABELS } from "@/components/app/constants/routineLabels";
import type { RoutineDeliveryFieldsProps } from "@/components/app/types/botRoutines.types";

const label = "text-xs font-medium text-muted-foreground";

/** Where the work happens and where each run shows up. */
export function RoutineDeliveryFields({ draft, disabled, workspaces, onChange }: RoutineDeliveryFieldsProps) {
  return <div className="grid gap-4">
    <label className="grid max-w-xs gap-1"><span className={label}>Works in</span>
      <Select aria-label="Workspace" value={draft.workspaceId} disabled={disabled || workspaces.length < 2} onChange={(event) => onChange({ workspaceId: event.target.value })}>
        {workspaces.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </Select></label>
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className={cn(label, "mb-1")}>Where runs appear</legend>
      <div className="grid grid-cols-2 gap-2">
        {ROUTINE_RUN_PLACES.map((place) => <label key={place}
          className={cn("flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm", draft.runIn === place ? "border-primary bg-primary/5" : "hover:bg-muted/60")}>
          <input type="radio" name="routine-run-in" className="mt-1" checked={draft.runIn === place} onChange={() => onChange({ runIn: place })} />
          <span><span className="block font-medium">{ROUTINE_RUN_PLACE_LABELS[place].label}</span>
            <span className="block text-xs text-muted-foreground">{ROUTINE_RUN_PLACE_LABELS[place].description}</span></span>
        </label>)}
      </div>
    </fieldset>
  </div>;
}
