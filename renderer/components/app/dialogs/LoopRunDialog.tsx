import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { LOOP_RUN_GOAL_TEMPLATE_GROUPS, LOOP_RUN_GOAL_TEMPLATES } from "@/components/app/constants/loopRunGoalTemplates";
import { DEFAULT_LOOP_WORKTREE_BRANCH_PREFIX, WORKTREE_BRANCH_PREFIX_OPTIONS } from "@/components/app/constants/worktreeBranchPrefixOptions";
import { LoopRunReviewFeedbackPicker } from "@/components/app/dialogs/LoopRunReviewFeedbackPicker";
import { useLoopRunReviewFeedback } from "@/components/app/hooks/useLoopRunReviewFeedback";
import { applyLoopRunGoalTemplate } from "@/components/app/logic/applyLoopRunGoalTemplate";
import { formatWorktreeBranchPreview } from "@/components/app/logic/formatWorktreeBranchPreview";
import {
  LOOP_RUN_REVIEW_FEEDBACK_TEMPLATE_ID,
  LOOP_RUN_SPEC_TEMPLATE_ID,
  LOOP_RUN_TASK_TEMPLATE_ID,
  shouldShowLoopRunReviewFeedbackPicker,
  shouldShowLoopRunSpecPicker,
  shouldShowLoopRunTaskPicker
} from "@/components/app/logic/loopRunGoalTemplateUi";
import { prepareLoopRunReviewHandoff } from "@/components/app/logic/prepareLoopRunReviewHandoff";
import { formatLoopRunReviewWorkItemLabel } from "@/components/app/logic/loopRunReviewFeedback";
import { Field } from "@/components/app/shared/Field";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { WizardProgress } from "@/components/app/shared/WizardProgress";
import type {
  LoopRunDialogProps,
  LoopRunGoalKind,
  LoopRunLimitsDraft,
  LoopRunStep
} from "@/components/app/types/loopDesigner.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceSpecSummary, WorkspaceTaskSummary } from "@shared/appTypes";
import { buildLoopLimitsFromDraft, isLoopLimitsDraftValid, loopLimitsToDraft } from "@shared/loopLimits";
import { hasLoopRunGoal } from "@shared/loopRunGoal";
import {
  GitBranch,
  ArrowLeft,
  ArrowRight,
  Clock3,
  FileCheck2,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Target,
  Timer
} from "lucide-react";
import { useEffect, useState } from "react";

const LOOP_RUN_STEPS: LoopRunStep[] = ["goal", "limits", "review"];

const LOOP_RUN_STEP_COPY: Record<LoopRunStep, { title: string; description: string }> = {
  goal: {
    title: "Choose the run goal",
    description: "Start from a common task, then point the workflow at a spec, task, or custom outcome."
  },
  limits: {
    title: "Set run guardrails",
    description: "Adjust this run's iteration, duration, and per-agent limits without changing the saved workflow."
  },
  review: {
    title: "Review and start",
    description: "Confirm the goal, worktree branch, participating agents, and guardrails before Nora creates the managed worktree."
  }
};

function isGoalReady(
  goalKind: LoopRunGoalKind,
  selectedSpecPath: string,
  selectedTaskPath: string,
  objective: string
): boolean {
  switch (goalKind) {
    case "spec":
      return hasLoopRunGoal({ specPath: selectedSpecPath, objective });
    case "task":
      return hasLoopRunGoal({ taskPath: selectedTaskPath, objective });
    case "custom":
      return objective.trim().length > 0;
  }
}

function goalSourceLabel(
  goalKind: LoopRunGoalKind,
  selectedSpecPath: string,
  selectedTaskPath: string,
  specs: WorkspaceSpecSummary[],
  tasks: WorkspaceTaskSummary[]
): string {
  if (goalKind === "spec") {
    return specs.find((spec) => spec.path === selectedSpecPath)?.title ?? "Workspace spec";
  }
  if (goalKind === "task") {
    return tasks.find((task) => task.path === selectedTaskPath)?.title ?? "Workspace task";
  }
  return "Custom instructions";
}

export function LoopRunDialog({ open, definition, onOpenChange, onStarted }: LoopRunDialogProps) {
  const [step, setStep] = useState<LoopRunStep>("goal");
  const [goalKind, setGoalKind] = useState<LoopRunGoalKind>("spec");
  const [specs, setSpecs] = useState<WorkspaceSpecSummary[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTaskSummary[]>([]);
  const [selectedSpecPath, setSelectedSpecPath] = useState("");
  const [selectedTaskPath, setSelectedTaskPath] = useState("");
  const [objective, setObjective] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [limitsDraft, setLimitsDraft] = useState<LoopRunLimitsDraft>({
    maxIterations: 10,
    maxDurationMinutes: 240,
    roleTimeoutMinutes: 30
  });
  const [branchPrefix, setBranchPrefix] = useState(DEFAULT_LOOP_WORKTREE_BRANCH_PREFIX);
  const [branchName, setBranchName] = useState("");
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !definition) return;
    setStep("goal");
    setGoalKind("custom");
    setSelectedSpecPath("");
    setSelectedTaskPath("");
    setObjective("");
    setSelectedTemplateId("");
    setLimitsDraft(loopLimitsToDraft(definition.limits));
    setBranchPrefix(DEFAULT_LOOP_WORKTREE_BRANCH_PREFIX);
    setBranchName(definition.name);
    setErrorMessage(null);
  }, [definition, open]);

  useEffect(() => {
    if (!open || !definition) return;
    let cancelled = false;
    setIsLoadingGoals(true);
    void Promise.all([
      noraWorkspaceClient.listWorkspaceSpecs(definition.projectId),
      noraWorkspaceClient.listWorkspaceTasks(definition.projectId)
    ])
      .then(([nextSpecs, nextTasks]) => {
        if (cancelled) return;
        const activeTasks = nextTasks.filter((task) => !task.completed);
        setSpecs(nextSpecs);
        setTasks(activeTasks);
        setSelectedSpecPath(nextSpecs[0]?.path ?? "");
        setSelectedTaskPath(activeTasks[0]?.path ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setSpecs([]);
          setTasks([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGoals(false);
      });
    return () => {
      cancelled = true;
    };
  }, [definition, open]);

  const showSpecPicker = shouldShowLoopRunSpecPicker(selectedTemplateId);
  const showTaskPicker = shouldShowLoopRunTaskPicker(selectedTemplateId);
  const showReviewFeedbackPicker = shouldShowLoopRunReviewFeedbackPicker(selectedTemplateId);
  const reviewFeedback = useLoopRunReviewFeedback(definition?.projectId ?? null, open && step === "goal");
  const reviewFeedbackReady = !showReviewFeedbackPicker || (
    reviewFeedback.selectedComments.length > 0
    && !reviewFeedback.isLoadingDetail
    && !reviewFeedback.isLoadingOverview
  );
  const goalReady = reviewFeedbackReady && isGoalReady(goalKind, selectedSpecPath, selectedTaskPath, objective);
  const limitsReady = isLoopLimitsDraftValid(limitsDraft);
  const worktreeReady = branchName.trim().length > 0;
  const canStart = !!definition && goalReady && limitsReady && worktreeReady;
  const stepIndex = LOOP_RUN_STEPS.indexOf(step);
  const stepCopy = LOOP_RUN_STEP_COPY[step];
  const progressSteps = LOOP_RUN_STEPS.map((item) => ({ id: item, title: LOOP_RUN_STEP_COPY[item].title }));
  const selectedTemplate = LOOP_RUN_GOAL_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? null;
  const sourceLabel = showReviewFeedbackPicker && reviewFeedback.selectedWorkItem
    ? formatLoopRunReviewWorkItemLabel(reviewFeedback.selectedWorkItem)
    : goalSourceLabel(goalKind, selectedSpecPath, selectedTaskPath, specs, tasks);
  const worktreeBranchPreview = formatWorktreeBranchPreview(branchPrefix, branchName);

  function handleTemplateChange(templateId: string): void {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      if (definition) {
        setLimitsDraft(loopLimitsToDraft(definition.limits));
      }
      setGoalKind("custom");
      setObjective("");
      reviewFeedback.reset();
      return;
    }
    const template = LOOP_RUN_GOAL_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    const applied = applyLoopRunGoalTemplate({
      template,
      specsAvailable: specs.length > 0,
      tasksAvailable: tasks.length > 0,
      selectedSpecPath,
      selectedTaskPath,
      firstSpecPath: specs[0]?.path ?? "",
      firstTaskPath: tasks[0]?.path ?? "",
      limitsDraft
    });
    setGoalKind(applied.goalKind);
    setSelectedSpecPath(applied.selectedSpecPath);
    setSelectedTaskPath(applied.selectedTaskPath);
    setObjective(applied.objective);
    setLimitsDraft(applied.limitsDraft);
    if (templateId === LOOP_RUN_REVIEW_FEEDBACK_TEMPLATE_ID) {
      reviewFeedback.reset();
    }
  }

  function isStepReady(candidate: LoopRunStep): boolean {
    if (candidate === "goal") return goalReady;
    if (candidate === "limits") return limitsReady;
    return canStart;
  }

  function goBack(): void {
    const previousStep = LOOP_RUN_STEPS[stepIndex - 1];
    if (previousStep) setStep(previousStep);
  }

  function goForward(): void {
    const nextStep = LOOP_RUN_STEPS[stepIndex + 1];
    if (nextStep && isStepReady(step)) setStep(nextStep);
  }

  async function start(): Promise<void> {
    if (!definition || !canStart) return;
    setIsStarting(true);
    setErrorMessage(null);
    try {
      let handoffPath: string | null = null;
      if (showReviewFeedbackPicker) {
        if (!reviewFeedback.detail) {
          throw new Error("Choose a pull or merge request with review comments before starting.");
        }
        handoffPath = await prepareLoopRunReviewHandoff({
          projectId: definition.projectId,
          detail: reviewFeedback.detail,
          selections: reviewFeedback.selectedComments
        });
      }
      const run = await noraLoopClient.startLoopRun({
        projectId: definition.projectId,
        definitionId: definition.id,
        objective: objective.trim(),
        specPath: goalKind === "spec" ? selectedSpecPath || null : null,
        taskPath: goalKind === "task" ? selectedTaskPath || null : null,
        handoffPath,
        limits: buildLoopLimitsFromDraft(limitsDraft),
        target: { kind: "new" },
        worktreeBranch: {
          prefix: branchPrefix.trim() || DEFAULT_LOOP_WORKTREE_BRANCH_PREFIX,
          name: branchName.trim()
        }
      });
      onStarted(run);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start workflow.");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(84vh,800px)] w-[min(920px,calc(100vw-2rem))] max-w-none"
        headerTitle={`Run ${definition?.name ?? "workflow"}`}
        onClose={() => onOpenChange(false)}
      >
        <DialogBody className="flex min-h-0 flex-col gap-5">
          <WizardProgress
            ariaLabel="Workflow run setup"
            steps={progressSteps}
            activeStep={step}
            onStepChange={setStep}
          />

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">{stepCopy.title}</h2>
            <p className="text-sm text-muted-foreground">{stepCopy.description}</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {step === "goal" ? <div className="grid items-start gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-primary/[0.04] p-5">
                <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Target className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Give this run one clear outcome</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    The writer works toward this goal while reviewers inspect each result. Templates can prefill the objective and sensible guardrails.
                  </p>
                </div>
              </div>

              <div className="space-y-5 rounded-lg border border-border p-5">
                <Field label="Goal template">
                  <Select value={selectedTemplateId} onChange={(event) => handleTemplateChange(event.target.value)}>
                    <option value="">Start without a template</option>
                    {LOOP_RUN_GOAL_TEMPLATE_GROUPS.map((group) => (
                      <optgroup key={group.id} label={group.label}>
                        {group.templates.map((template) => (
                          <option
                            key={template.id}
                            value={template.id}
                            disabled={
                              (template.id === LOOP_RUN_SPEC_TEMPLATE_ID && specs.length === 0)
                              || (template.id === LOOP_RUN_TASK_TEMPLATE_ID && tasks.length === 0)
                              || (
                                template.id === LOOP_RUN_REVIEW_FEEDBACK_TEMPLATE_ID
                                && reviewFeedback.workItems.length === 0
                                && !reviewFeedback.isLoadingOverview
                              )
                            }
                          >
                            {template.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                </Field>
                {selectedTemplate ? <p className="text-xs leading-5 text-muted-foreground">
                  {selectedTemplate.description}
                </p> : null}
                {showSpecPicker ? <Field label="Spec">
                  <Select
                    value={selectedSpecPath}
                    onChange={(event) => setSelectedSpecPath(event.target.value)}
                    disabled={isLoadingGoals || specs.length === 0}
                  >
                    {specs.map((spec) => <option key={spec.path} value={spec.path}>{spec.title}</option>)}
                  </Select>
                </Field> : null}
                {showTaskPicker ? <Field label="Task">
                  <Select
                    value={selectedTaskPath}
                    onChange={(event) => setSelectedTaskPath(event.target.value)}
                    disabled={isLoadingGoals || tasks.length === 0}
                  >
                    {tasks.map((task) => <option key={task.path} value={task.path}>{task.title}</option>)}
                  </Select>
                </Field> : null}
                {showReviewFeedbackPicker ? <LoopRunReviewFeedbackPicker reviewFeedback={reviewFeedback} /> : null}
                <Field label={showSpecPicker || showTaskPicker || showReviewFeedbackPicker ? "Additional instructions" : "Run goal"}>
                  <Textarea
                    autoFocus={!showSpecPicker && !showTaskPicker && !showReviewFeedbackPicker}
                    className="min-h-32 resize-none"
                    placeholder={showSpecPicker || showTaskPicker || showReviewFeedbackPicker
                      ? "Optional extra guidance beyond the selected file..."
                      : "Describe the outcome this run should accomplish..."}
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                  />
                </Field>
              </div>
            </div> : null}

            {step === "limits" ? <div className="grid items-start gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <Field label="Maximum iterations" className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Repeat2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={limitsDraft.maxIterations}
                      onChange={(event) => setLimitsDraft((current) => ({
                        ...current,
                        maxIterations: Number(event.target.value)
                      }))}
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
                      value={limitsDraft.maxDurationMinutes}
                      onChange={(event) => setLimitsDraft((current) => ({
                        ...current,
                        maxDurationMinutes: Number(event.target.value)
                      }))}
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
                      value={limitsDraft.roleTimeoutMinutes}
                      onChange={(event) => setLimitsDraft((current) => ({
                        ...current,
                        roleTimeoutMinutes: Number(event.target.value)
                      }))}
                    />
                  </div>
                </Field>
              </div>

              <section className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-primary/[0.04] p-5">
                <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Guardrails apply to this run only</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    The workflow pauses when a limit is reached, preserving its worktree and progress so you can inspect or resume it.
                  </p>
                </div>
                <div className="border-t border-primary/15 pt-4 text-xs leading-5 text-muted-foreground">
                  Saved workflow defaults remain unchanged.
                </div>
              </section>
            </div> : null}

            {step === "review" ? <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="space-y-5 rounded-lg border border-border p-5">
                <div className="flex items-center gap-3 border-b border-border pb-5">
                  <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileCheck2 className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{definition?.name ?? "Workflow"}</h3>
                    <p className="text-sm text-muted-foreground">Ready to create a managed worktree and start the writer.</p>
                  </div>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Goal source</p>
                    <p className="mt-1 font-medium">{sourceLabel}</p>
                  </div>
                  {objective.trim() ? <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {goalKind === "custom" ? "Goal" : "Additional instructions"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">{objective.trim()}</p>
                  </div> : null}
                  <div className="space-y-4 border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <GitBranch className="size-4 text-muted-foreground" aria-hidden="true" />
                      <p className="text-sm font-medium">Worktree branch</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Branch prefix">
                        <Select value={branchPrefix} onChange={(event) => setBranchPrefix(event.target.value)}>
                          {WORKTREE_BRANCH_PREFIX_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Branch name">
                        <Input
                          value={branchName}
                          onChange={(event) => setBranchName(event.target.value)}
                          placeholder={definition?.name ?? "workflow-run"}
                          required
                        />
                      </Field>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Git branch <span className="font-medium text-foreground">{worktreeBranchPreview}</span>
                      {" "}with a short unique suffix added when the run starts.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-5 rounded-lg border border-primary/20 bg-primary/[0.04] p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">Run summary</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agents</p>
                    {definition ? (
                      <div className="space-y-2">
                        {[definition.writer, ...definition.reviewers].map((role) => (
                          <div key={role.id} className="flex items-center gap-3 rounded-md border border-primary/15 bg-background/60 p-2.5">
                            <AgentToolIcon
                              toolId={role.toolId}
                              label={role.toolId}
                              className="size-8 shrink-0 border border-border/60"
                              imageClassName="size-5 rounded-sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{role.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{role.toolId}</p>
                            </div>
                            <Badge variant="secondary">{role.kind === "writer" ? "Writer" : "Reviewer"}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Worktree branch</span>
                    <span className="font-medium">{worktreeBranchPreview}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Maximum iterations</span>
                    <span className="font-medium">{limitsDraft.maxIterations}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Total runtime</span>
                    <span className="font-medium">{limitsDraft.maxDurationMinutes} min</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Agent timeout</span>
                    <span className="font-medium">{limitsDraft.roleTimeoutMinutes} min</span>
                  </div>
                </div>
                <p className="border-t border-primary/15 pt-4 text-xs leading-5 text-muted-foreground">
                  Nora will open the run details automatically after the workflow starts.
                </p>
              </section>
            </div> : null}
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </DialogBody>

        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="outline" onClick={stepIndex === 0 ? () => onOpenChange(false) : goBack}>
              {stepIndex > 0 ? <ArrowLeft className="mr-2 size-4" aria-hidden="true" /> : null}
              {stepIndex === 0 ? "Cancel" : "Back"}
            </Button>
            {stepIndex < LOOP_RUN_STEPS.length - 1 ? <Button onClick={goForward} disabled={!isStepReady(step)}>
              Continue<ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Button> : <Button disabled={isStarting || !canStart} onClick={() => void start()}>
              {isStarting ? "Starting..." : "Start workflow"}
            </Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
