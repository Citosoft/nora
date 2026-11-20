import { CalendarClock, ChevronDown } from "lucide-react";
import { routinesForTemplate } from "@shared/bots/templateRoutines";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RoutinePresetDetails } from "@/components/app/panels/bots/routines/RoutinePresetDetails";
import type { BotRoutinePresetsProps } from "@/components/app/types/botEditor.types";

export function BotRoutinePresets({ template, selectedIds, workspaces, workspaceId, workspaceLocked, timezone, disabled, onSelect, onWorkspace }: BotRoutinePresetsProps) {
  const routines = routinesForTemplate(template);
  if (!routines.length) return null;
  return <div className="space-y-1.5 text-sm">
    <p className="font-medium">Routine presets</p>
    <Popover>
      <PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-start gap-2" disabled={disabled}>
        <CalendarClock className="size-4" aria-hidden="true" />{selectedIds.length} {selectedIds.length === 1 ? "routine" : "routines"} · added paused<ChevronDown className="ml-auto size-4" aria-hidden="true" />
      </Button></PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} className="z-[31000] max-h-[min(30rem,var(--radix-popover-content-available-height))] w-[min(26rem,calc(100vw-2rem))] space-y-3 overflow-y-auto">
        <h3 className="text-sm font-medium">Include routine presets</h3>
        <ul className="space-y-4">{routines.map((routine) => <li key={routine.id} className="flex items-start gap-2">
          <input type="checkbox" className="mt-1 accent-primary" aria-label={`Include ${routine.name}`} checked={selectedIds.includes(routine.id)} disabled={disabled}
            onChange={(event) => onSelect(event.target.checked ? [...selectedIds, routine.id] : selectedIds.filter((id) => id !== routine.id))} />
          <RoutinePresetDetails template={routine} />
        </li>)}</ul>
        <div className="space-y-1.5 border-t pt-3 text-sm">
          <p className="font-medium">Run in workspace</p>
          <Select aria-label="Routine workspace" value={workspaceId} disabled={disabled || workspaceLocked || !workspaces.length} onChange={(event) => onWorkspace(event.target.value)}>
            {!workspaces.length && <option value="">No workspace available</option>}
            {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </Select>
          <p className="text-xs text-muted-foreground">Times use {timezone}. Routines are added paused; edit and enable them from the bot’s Routines section.</p>
        </div>
      </PopoverContent>
    </Popover>
    <p className="text-xs text-muted-foreground">Review the tasks and schedules before enabling them in Routines.</p>
  </div>;
}
