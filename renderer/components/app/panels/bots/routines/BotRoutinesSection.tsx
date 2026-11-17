import { useMemo, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { ROUTINES_PER_BOT_MAX } from "@shared/bots/routines/contracts";
import { useBotRoutines } from "@/components/app/hooks/useBotRoutines";
import { Button } from "@/components/ui/button";
import { BotInfoSection } from "@/components/app/panels/bots/BotInfoSection";
import { DeleteRoutineDialog } from "./DeleteRoutineDialog";
import { RoutineEditorDialog } from "./RoutineEditorDialog";
import { RoutineRow } from "./RoutineRow";
import { RoutineRunList } from "./RoutineRunList";
import type { BotRoutinesSectionProps } from "@/components/app/types/botRoutines.types";

/** The bot's routines: scheduled instructions it runs on its own, with controls and their recent runs. */
export function BotRoutinesSection({ bot, workspaces, currentWorkspace, openerFor }: BotRoutinesSectionProps) {
  const state = useBotRoutines(bot.id);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // A workspace bot only works in its own workspace; a global bot can be scheduled in any of them.
  const scope = bot.scope;
  const available = useMemo(() => scope.kind === "workspace" ? workspaces.filter((entry) => entry.id === scope.workspaceId) : workspaces, [scope, workspaces]);
  const defaultWorkspaceId = (available.find((entry) => entry.id === currentWorkspace?.id) ?? available[0])?.id ?? "";
  const workspaceName = (id: string): string => workspaces.find((entry) => entry.id === id)?.name ?? "A closed workspace";
  const timezoneFor = (routineId: string): string => state.routines.find((routine) => routine.id === routineId)?.timezone ?? "UTC";
  const editingRoutine = editing?.id ? state.routines.find((routine) => routine.id === editing.id) ?? null : null;
  const deleting = deletingId ? state.routines.find((routine) => routine.id === deletingId) ?? null : null;
  const full = state.routines.length >= ROUTINES_PER_BOT_MAX;
  return <BotInfoSection title="Routines">
    {state.loading ? <p role="status" className="text-xs text-muted-foreground">Loading routines…</p>
      : state.routines.length ? <ul className="divide-y divide-border/60 rounded-md border border-border/60">
        {state.routines.map((routine) => <RoutineRow key={routine.id} routine={routine} workspaceName={workspaceName(routine.workspaceId)} disabled={state.busy}
          lastRun={state.runs.find((run) => run.routineId === routine.id) ?? null}
          onEdit={() => setEditing({ id: routine.id })} onToggle={() => void state.setActive(routine.id, !routine.active)}
          onRunNow={() => void state.runNow(routine.id)} onRemove={() => setDeletingId(routine.id)} />)}
      </ul> : <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <CalendarClock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Give {bot.name} work to do on a schedule, such as a morning summary or a weekly check.</p>}
    <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={state.busy || full || !available.length} onClick={() => setEditing({ id: null })}>
      <Plus className="size-3.5" aria-hidden="true" />Add routine</Button>
    {!editing && !deleting && state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
    {state.runs.length > 0 && <div className="space-y-1 pt-1">
      <h4 className="text-xs font-medium text-muted-foreground">Recent runs</h4>
      <RoutineRunList runs={state.runs} timezoneFor={timezoneFor} openerFor={openerFor} />
    </div>}
    {editing && <RoutineEditorDialog key={editing.id ?? "new"} bot={bot} routine={editingRoutine} workspaces={available} defaultWorkspaceId={defaultWorkspaceId}
      busy={state.busy} error={state.error} onClose={() => setEditing(null)}
      onSave={(input) => editingRoutine ? state.update(editingRoutine.id, input) : state.create(input)} />}
    {deleting && <DeleteRoutineDialog routine={deleting} busy={state.busy} onClose={() => setDeletingId(null)}
      onConfirm={() => void state.remove(deleting.id).then((removed) => { if (removed) setDeletingId(null); })} />}
  </BotInfoSection>;
}
