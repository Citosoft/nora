import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import { canRunLoopHeadless } from "@shared/loopHeadlessLaunch";
import { Field } from "@/components/app/shared/Field";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { WizardProgress } from "@/components/app/shared/WizardProgress";
import type {
  LoopDefinitionDraft,
  LoopDesignerDialogProps,
  LoopDesignerStep
} from "@/components/app/types/loopDesigner.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Plus,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const LOOP_DESIGNER_STEPS: LoopDesignerStep[] = ["basics", "writer", "reviewers", "limits"];

const LOOP_STEP_COPY: Record<LoopDesignerStep, { title: string; description: string }> = {
  basics: {
    title: "Name the workflow",
    description: "Save a reusable workflow pattern. You choose the run goal when you start it."
  },
  writer: {
    title: "Choose the writer",
    description: "Configure the agent responsible for implementing the run goal and responding to feedback."
  },
  reviewers: {
    title: "Build the review team",
    description: "Add independent reviewers with focused instructions. Reviewers are optional and run in order."
  },
  limits: {
    title: "Set guardrails",
    description: "Control how long the workflow can run, then review it before saving."
  }
};

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function createDraft(toolId: string): LoopDefinitionDraft {
  return {
    id: createId("loop"),
    name: "Implementation workflow",
    writer: {
      id: createId("writer"),
      kind: "writer",
      name: "Implementer",
      toolId,
      instructions: "Implement the assigned work, verify it, and address reviewer feedback."
    },
    reviewers: [],
    maxIterations: 10,
    maxDurationMinutes: 240,
    roleTimeoutMinutes: 30
  };
}

function isPositiveIntegerInRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isStepValid(step: LoopDesignerStep, draft: LoopDefinitionDraft): boolean {
  switch (step) {
    case "basics":
      return draft.name.trim().length > 0;
    case "writer":
      return draft.writer.name.trim().length > 0
        && draft.writer.toolId.length > 0
        && draft.writer.instructions.trim().length > 0;
    case "reviewers":
      return draft.reviewers.every((reviewer) => reviewer.name.trim().length > 0
        && reviewer.toolId.length > 0
        && reviewer.instructions.trim().length > 0);
    case "limits":
      return isPositiveIntegerInRange(draft.maxIterations, 1, 100)
        && isPositiveIntegerInRange(draft.maxDurationMinutes, 5, 1440)
        && isPositiveIntegerInRange(draft.roleTimeoutMinutes, 1, 240);
  }
}

export function LoopDesignerDialog({
  open,
  projectId,
  agentCatalog,
  definition,
  onOpenChange,
  onSaved
}: LoopDesignerDialogProps) {
  const tools = useMemo(
    () => agentCatalog.filter((tool) => tool.detected && tool.enabled && canRunLoopHeadless(tool.id)),
    [agentCatalog]
  );
  const [draft, setDraft] = useState<LoopDefinitionDraft>(() => createDraft(tools[0]?.id ?? ""));
  const [step, setStep] = useState<LoopDesignerStep>("basics");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(definition ? {
      id: definition.id,
      name: definition.name,
      writer: definition.writer,
      reviewers: definition.reviewers,
      maxIterations: definition.limits.maxIterations,
      maxDurationMinutes: Math.round(definition.limits.maxDurationMs / 60_000),
      roleTimeoutMinutes: Math.round(definition.limits.roleTimeoutMs / 60_000),
      createdAt: definition.createdAt
    } : createDraft(tools[0]?.id ?? ""));
    setStep("basics");
    setErrorMessage(null);
  }, [definition, open, projectId, tools]);

  const stepIndex = LOOP_DESIGNER_STEPS.indexOf(step);
  const stepCopy = LOOP_STEP_COPY[step];
  const progressSteps = LOOP_DESIGNER_STEPS.map((item) => ({ id: item, title: LOOP_STEP_COPY[item].title }));
  const selectedWriterTool = tools.find((tool) => tool.id === draft.writer.toolId) ?? null;
  const allStepsValid = LOOP_DESIGNER_STEPS.every((item) => isStepValid(item, draft));

  const updateReviewer = (index: number, partial: Partial<LoopDefinitionDraft["reviewers"][number]>) => {
    setDraft((current) => ({
      ...current,
      reviewers: current.reviewers.map((role, roleIndex) => roleIndex === index ? { ...role, ...partial } : role)
    }));
  };

  const addReviewer = () => {
    setDraft((current) => ({
      ...current,
      reviewers: [...current.reviewers, {
        id: createId("reviewer"),
        kind: "reviewer",
        name: `Reviewer ${current.reviewers.length + 1}`,
        toolId: tools[0]?.id ?? "",
        instructions: "Review correctness, regressions, architecture, and missing tests."
      }]
    }));
  };

  const save = async () => {
    if (!allStepsValid) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await noraLoopClient.saveLoopDefinition({
        projectId,
        definition: {
          id: draft.id,
          name: draft.name.trim(),
          writer: { ...draft.writer, name: draft.writer.name.trim(), instructions: draft.writer.instructions.trim() },
          reviewers: draft.reviewers.map((reviewer) => ({
            ...reviewer,
            name: reviewer.name.trim(),
            instructions: reviewer.instructions.trim()
          })),
          limits: {
            maxIterations: draft.maxIterations,
            maxDurationMs: draft.maxDurationMinutes * 60_000,
            roleTimeoutMs: draft.roleTimeoutMinutes * 60_000
          },
          ...(draft.createdAt ? { createdAt: draft.createdAt } : {})
        }
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save workflow.");
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    const previousStep = LOOP_DESIGNER_STEPS[stepIndex - 1];
    if (previousStep) setStep(previousStep);
  };

  const goForward = () => {
    const nextStep = LOOP_DESIGNER_STEPS[stepIndex + 1];
    if (nextStep && isStepValid(step, draft)) setStep(nextStep);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(84vh,800px)] w-[min(920px,calc(100vw-2rem))] max-w-none"
        headerTitle={definition ? "Edit workflow" : "Create workflow"}
        onClose={() => onOpenChange(false)}
      >
        <DialogBody className="flex min-h-0 flex-col gap-5">
          <WizardProgress ariaLabel="Workflow setup" steps={progressSteps} activeStep={step} onStepChange={setStep} />

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">{stepCopy.title}</h2>
            <p className="text-sm text-muted-foreground">{stepCopy.description}</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {step === "basics" ? (
              <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="flex min-h-52 flex-col justify-between rounded-lg border border-primary/20 bg-primary/[0.04] p-5">
                  <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Repeat2 className="size-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">A repeatable agent workflow</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      The writer implements the run goal, reviewers inspect the result, and feedback returns to the writer until the work is accepted or a guardrail is reached.
                    </p>
                  </div>
                </div>
                <div className="space-y-5 rounded-lg border border-border p-5">
                  <Field label="Workflow name">
                    <Input
                      autoFocus
                      placeholder="Implementation workflow"
                      value={draft.name}
                      onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    />
                  </Field>
                  <p className="text-xs leading-5 text-muted-foreground">
                    When you run this workflow, Nora will ask for the goal — such as a spec, task, or custom instructions.
                  </p>
                </div>
              </div>
            ) : null}

            {step === "writer" ? (
              <div className="mx-auto max-w-2xl space-y-5 rounded-lg border border-border p-5">
                <div className="flex items-center gap-3 border-b border-border pb-5">
                  <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    {selectedWriterTool ? (
                      <AgentToolIcon
                        toolId={selectedWriterTool.id}
                        label={selectedWriterTool.label}
                        className="size-7 bg-transparent"
                        imageClassName="size-6"
                      />
                    ) : <Sparkles className="size-5" aria-hidden="true" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">Primary implementation agent</h3>
                    <p className="text-sm text-muted-foreground">This role owns the working state between review cycles.</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Role name">
                    <Input
                      value={draft.writer.name}
                      onChange={(event) => setDraft((current) => ({
                        ...current,
                        writer: { ...current.writer, name: event.target.value }
                      }))}
                    />
                  </Field>
                  <Field label="Agent tool">
                    <Select
                      value={draft.writer.toolId}
                      onChange={(event) => setDraft((current) => ({
                        ...current,
                        writer: { ...current.writer, toolId: event.target.value }
                      }))}
                    >
                      {tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.label}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Writer instructions">
                  <Textarea
                    className="min-h-40 resize-none"
                    value={draft.writer.instructions}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      writer: { ...current.writer, instructions: event.target.value }
                    }))}
                  />
                </Field>
              </div>
            ) : null}

            {step === "reviewers" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UsersRound className="size-4" aria-hidden="true" />
                    <span>{draft.reviewers.length} of 5 reviewers configured</span>
                  </div>
                  <Button variant="outline" size="sm" disabled={draft.reviewers.length >= 5 || tools.length === 0} onClick={addReviewer}>
                    <Plus className="mr-2 size-4" aria-hidden="true" />Add reviewer
                  </Button>
                </div>

                {draft.reviewers.length === 0 ? (
                  <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                    <div className="max-w-sm space-y-4">
                      <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                        <UserRoundCheck className="size-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold">No reviewers yet</h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          The workflow can run with only a writer, or you can add specialist reviewers for tests, architecture, security, or product behavior.
                        </p>
                      </div>
                      <Button onClick={addReviewer} disabled={tools.length === 0}>
                        <Plus className="mr-2 size-4" aria-hidden="true" />Add first reviewer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draft.reviewers.map((reviewer, index) => {
                      const reviewerTool = tools.find((tool) => tool.id === reviewer.toolId) ?? null;
                      return (
                        <section key={reviewer.id} className="space-y-4 rounded-lg border border-border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="grid size-9 place-items-center rounded-lg bg-muted">
                                {reviewerTool ? (
                                  <AgentToolIcon
                                    toolId={reviewerTool.id}
                                    label={reviewerTool.label}
                                    className="size-6 bg-transparent"
                                    imageClassName="size-5"
                                  />
                                ) : <span className="text-sm font-semibold">{index + 1}</span>}
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold">Reviewer {index + 1}</h3>
                                <p className="text-xs text-muted-foreground">Runs after the writer completes an iteration.</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDraft((current) => ({
                                ...current,
                                reviewers: current.reviewers.filter((_, roleIndex) => roleIndex !== index)
                              }))}
                              aria-label={`Remove reviewer ${index + 1}`}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Role name">
                              <Input value={reviewer.name} onChange={(event) => updateReviewer(index, { name: event.target.value })} />
                            </Field>
                            <Field label="Agent tool">
                              <Select value={reviewer.toolId} onChange={(event) => updateReviewer(index, { toolId: event.target.value })}>
                                {tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.label}</option>)}
                              </Select>
                            </Field>
                          </div>
                          <Field label="Review instructions">
                            <Textarea
                              className="min-h-24 resize-none"
                              value={reviewer.instructions}
                              onChange={(event) => updateReviewer(index, { instructions: event.target.value })}
                            />
                          </Field>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {step === "limits" ? (
              <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <Field label="Maximum iterations" className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Repeat2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={draft.maxIterations}
                        onChange={(event) => setDraft((current) => ({ ...current, maxIterations: Number(event.target.value) }))}
                      />
                    </div>
                  </Field>
                  <Field label="Total runtime (minutes)" className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <Input
                        type="number"
                        min={5}
                        max={1440}
                        value={draft.maxDurationMinutes}
                        onChange={(event) => setDraft((current) => ({ ...current, maxDurationMinutes: Number(event.target.value) }))}
                      />
                    </div>
                  </Field>
                  <Field label="Per-role timeout (minutes)" className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Timer className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <Input
                        type="number"
                        min={1}
                        max={240}
                        value={draft.roleTimeoutMinutes}
                        onChange={(event) => setDraft((current) => ({ ...current, roleTimeoutMinutes: Number(event.target.value) }))}
                      />
                    </div>
                  </Field>
                </div>

                <section className="space-y-4 rounded-lg border border-primary/20 bg-primary/[0.04] p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                    <h3 className="font-semibold">Workflow summary</h3>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Run goal</p>
                      <p className="mt-1 leading-6 text-muted-foreground">Chosen when you start a run</p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Writer</span>
                      <Badge variant="secondary">{draft.writer.name || "Unnamed"}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Review team</span>
                      <span className="font-medium">{draft.reviewers.length} reviewer{draft.reviewers.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Maximum cycles</span>
                      <span className="font-medium">{draft.maxIterations}</span>
                    </div>
                  </div>
                  <p className="border-t border-primary/15 pt-4 text-xs leading-5 text-muted-foreground">
                    A run stops when reviewers accept the work, the iteration limit is reached, or the total runtime expires.
                  </p>
                </section>
              </div>
            ) : null}
          </div>

          {tools.length === 0 ? (
            <p className="text-sm text-destructive">Enable at least one detected agent tool before creating a workflow.</p>
          ) : null}
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </DialogBody>

        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="outline" onClick={stepIndex === 0 ? () => onOpenChange(false) : goBack}>
              {stepIndex > 0 ? <ArrowLeft className="mr-2 size-4" aria-hidden="true" /> : null}
              {stepIndex === 0 ? "Cancel" : "Back"}
            </Button>
            {stepIndex < LOOP_DESIGNER_STEPS.length - 1 ? (
              <Button onClick={goForward} disabled={!isStepValid(step, draft) || tools.length === 0}>
                Continue<ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={() => void save()} disabled={isSaving || tools.length === 0 || !allStepsValid}>
                {isSaving ? "Saving..." : definition ? "Save changes" : "Create workflow"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
