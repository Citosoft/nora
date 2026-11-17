import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ROUTINE_TEMPLATES } from "@shared/bots/routines/templates";
import { Button } from "@/components/ui/button";
import { applyRoutineTemplate, newRoutineDraft, routineDraft, routineInputFromDraft } from "@/components/app/logic/routineEditor";
import { routineEditorSteps, routineStepReachable } from "@/components/app/logic/routineEditorSteps";
import { RoutineDeliveryFields } from "./RoutineDeliveryFields";
import { RoutineEditorStepRail } from "./RoutineEditorStepRail";
import { RoutineScheduleFields } from "./RoutineScheduleFields";
import { RoutineTaskFields } from "./RoutineTaskFields";
import { RoutineTemplatePicker } from "./RoutineTemplatePicker";
import type { RoutineDraft, RoutineEditorDialogProps, RoutineEditorStep } from "@/components/app/types/botRoutines.types";

const STEP_HEADINGS: Record<RoutineEditorStep, string> = {
  template: "Start from a template or a blank routine",
  task: "What should the routine do?",
  schedule: "When should it run?",
  delivery: "Where does it work, and where do runs appear?"
};

/**
 * Creates or edits one routine in short steps: a template (new routines only), the task, the schedule and delivery. The dialog is
 * wide rather than tall, with the steps and what each holds down the side so the whole routine stays visible.
 */
export function RoutineEditorDialog({ bot, routine, workspaces, defaultWorkspaceId, busy, error, onSave, onClose }: RoutineEditorDialogProps) {
  const isNew = !routine;
  const [draft, setDraft] = useState<RoutineDraft>(() => routine ? routineDraft(routine, new Date()) : newRoutineDraft(defaultWorkspaceId, new Date()));
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [step, setStep] = useState<RoutineEditorStep>(isNew ? "template" : "task");
  const steps = useMemo(() => routineEditorSteps(isNew, draft, templateId, workspaces), [isNew, draft, templateId, workspaces]);
  const index = steps.findIndex((entry) => entry.id === step);
  const last = index === steps.length - 1;
  const current = steps[index];
  const ready = steps.every((entry) => entry.complete);
  const change = (patch: Partial<RoutineDraft>): void => setDraft((value) => ({ ...value, ...patch }));
  const pickTemplate = (id: string | null): void => {
    setTemplateId(id);
    const template = ROUTINE_TEMPLATES.find((entry) => entry.id === id);
    setDraft((value) => template ? applyRoutineTemplate(value, template) : { ...newRoutineDraft(value.workspaceId, new Date()), timezone: value.timezone });
    setStep("task");
  };
  const save = async (): Promise<void> => {
    if (!busy && ready && await onSave(routineInputFromDraft(draft, bot.id, new Date()))) onClose();
  };
  const advance = async (): Promise<void> => {
    if (busy || !current?.complete) return;
    if (last) await save(); else setStep(steps[index + 1].id);
  };
  const fields = { draft, disabled: busy, onChange: change };
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] flex h-[min(480px,calc(100vh-3rem))] w-[min(800px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border bg-card shadow-panel outline-none">
        <RoutineEditorStepRail steps={steps} current={step} reachable={(id) => !busy && routineStepReachable(steps, id)} onSelect={setStep} />
        {/* Enter moves to the next step; only the last step saves. */}
        <form className="flex min-w-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); void advance(); }}>
          <div className="space-y-0.5 px-6 pb-3 pt-5">
            <Dialog.Title className="text-base font-semibold">{routine ? `Edit ${routine.name}` : `New routine for ${bot.name}`}</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">{STEP_HEADINGS[step]}</Dialog.Description>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            {step === "template" && <RoutineTemplatePicker selectedId={templateId} disabled={busy} onPick={pickTemplate} />}
            {step === "task" && <RoutineTaskFields {...fields} botName={bot.name} />}
            {step === "schedule" && <RoutineScheduleFields {...fields} />}
            {step === "delivery" && <RoutineDeliveryFields {...fields} workspaces={workspaces} />}
          </div>
          <div className="flex items-center gap-2 border-t bg-muted/45 px-6 py-3">
            {error ? <p role="alert" className="min-w-0 flex-1 truncate text-sm text-destructive" title={error}>{error}</p>
              : <p className="flex-1 text-xs text-muted-foreground">{bot.name} runs this while Nora is open, with its own model and permissions.</p>}
            <Dialog.Close asChild><Button type="button" variant="ghost" disabled={busy}>Cancel</Button></Dialog.Close>
            {index > 0 && <Button type="button" variant="outline" disabled={busy} onClick={() => setStep(steps[index - 1].id)}>Back</Button>}
            {/* An existing routine can be saved from any step; a new one is created from the last. */}
            {routine && !last && <Button type="button" variant="outline" disabled={busy || !ready} onClick={() => void save()}>Save routine</Button>}
            <Button type="submit" disabled={busy || !current?.complete || (last && !ready)}>
              {last ? busy ? "Saving…" : routine ? "Save routine" : "Create routine" : "Next"}</Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
