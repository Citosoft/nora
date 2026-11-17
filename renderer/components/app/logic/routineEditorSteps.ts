import { describeRoutineSchedule } from "@shared/bots/routines/describe";
import { ROUTINE_TEMPLATES } from "@shared/bots/routines/templates";
import { ROUTINE_RUN_PLACE_LABELS } from "@/components/app/constants/routineLabels";
import { routineInputFromDraft } from "./routineEditor";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { RoutineDraft, RoutineEditorStep, RoutineEditorStepInfo } from "@/components/app/types/botRoutines.types";

const NEW_STEPS: readonly RoutineEditorStep[] = ["template", "task", "schedule", "delivery"];
const EDIT_STEPS: readonly RoutineEditorStep[] = ["task", "schedule", "delivery"];

export function routineEditorStepOrder(isNew: boolean): readonly RoutineEditorStep[] {
  return isNew ? NEW_STEPS : EDIT_STEPS;
}

/** Whether a step has what saving needs; the schedule step is checked in main, so here it only needs its own fields filled in. */
function stepComplete(step: RoutineEditorStep, draft: RoutineDraft): boolean {
  switch (step) {
    case "template": return true;
    case "task": return !!draft.name.trim() && !!draft.instruction.trim();
    case "schedule": return !!draft.timezone.trim() && (draft.kind !== "custom" || !!draft.expression.trim())
      && (!["daily", "weekdays", "weekly", "monthly", "once"].includes(draft.kind) || !!draft.time) && (draft.kind !== "once" || !!draft.date);
    case "delivery": return !!draft.workspaceId;
  }
}

/** Each step with a one-line summary of what it holds, for the step rail. */
export function routineEditorSteps(isNew: boolean, draft: RoutineDraft, templateId: string | null, workspaces: readonly NativeWorkspace[]): RoutineEditorStepInfo[] {
  const summaries: Record<RoutineEditorStep, string> = {
    template: ROUTINE_TEMPLATES.find((template) => template.id === templateId)?.name ?? "Blank routine",
    task: draft.name.trim() || "Name and instructions",
    schedule: stepComplete("schedule", draft) ? describeRoutineSchedule(routineInputFromDraft(draft, "summary", new Date()).schedule) : "When it runs",
    delivery: `${workspaces.find((entry) => entry.id === draft.workspaceId)?.name ?? "Choose a workspace"} · ${ROUTINE_RUN_PLACE_LABELS[draft.runIn].short}`
  };
  const titles: Record<RoutineEditorStep, string> = { template: "Start from", task: "Task", schedule: "Schedule", delivery: "Delivery" };
  return routineEditorStepOrder(isNew).map((id) => ({ id, title: titles[id], summary: summaries[id], complete: stepComplete(id, draft) }));
}

/** A step can be opened once every step before it is complete, so the user never lands past a gap. */
export function routineStepReachable(steps: readonly RoutineEditorStepInfo[], step: RoutineEditorStep): boolean {
  const index = steps.findIndex((entry) => entry.id === step);
  return index >= 0 && steps.slice(0, index).every((entry) => entry.complete);
}
