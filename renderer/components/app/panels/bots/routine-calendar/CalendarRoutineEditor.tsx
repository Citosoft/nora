import { useBotRoutines } from "@/components/app/hooks/useBotRoutines";
import { RoutineEditorDialog } from "@/components/app/panels/bots/routines/RoutineEditorDialog";
import type { CalendarRoutineEditorProps } from "@/components/app/types/routineCalendar.types";

/** The routine editor opened from the calendar, saving through the routine's bot like the bot's own Routines section. */
export function CalendarRoutineEditor({ bot, routine, workspaces, onClose }: CalendarRoutineEditorProps) {
  const routines = useBotRoutines(bot.id);
  const scope = bot.scope;
  const available = scope.kind === "workspace" ? workspaces.filter((entry) => entry.id === scope.workspaceId) : workspaces;
  return <RoutineEditorDialog bot={bot} routine={routine} workspaces={available} defaultWorkspaceId={routine.workspaceId}
    busy={routines.busy} error={routines.error} onClose={onClose} onSave={(input) => routines.update(routine.id, input)} />;
}
