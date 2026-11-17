import { useProjectBots } from "@/components/app/hooks/useProjectBots";
import type { WorkflowRunSetupProps } from "@/components/app/types/workflowSurface.types";
import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { LOOP_RUN_GOAL_TEMPLATE_GROUPS, LOOP_RUN_GOAL_TEMPLATES } from "@/components/app/constants/loopRunGoalTemplates";
import { WORKTREE_BRANCH_PREFIX_OPTIONS } from "@/components/app/constants/worktreeBranchPrefixOptions";
import { DEFAULT_LOOP_WORKTREE_BRANCH_PREFIX } from "@shared/loopWorktree";
import { LoopRunReviewFeedbackPicker } from "@/components/app/dialogs/LoopRunReviewFeedbackPicker";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useLoopRunReviewFeedback } from "@/components/app/hooks/useLoopRunReviewFeedback";
import { buildWorkflowAgentSummaries } from "@/components/app/logic/workflowAgents";
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
import { WizardProgress } from "@/components/app/shared/WizardProgress";
import type {
  LoopRunGoalKind,
  LoopRunStep
} from "@/components/app/types/loopDesigner.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceSpecSummary, WorkspaceTaskSummary } from "@shared/appTypes";
import { buildLoopLimitsFromDraft, isLoopLimitsDraftValid, loopLimitsToDraft, type LoopLimitsDraft } from "@shared/loopLimits";
import { hasLoopRunGoal } from "@shared/loopRunGoal";
import { isGitProject } from "@shared/projectVersionControl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkflowAgentList } from "./WorkflowAgentList";
import { WorkflowDetailList } from "./WorkflowDetailList";
import { WorkflowLimitsFields } from "./WorkflowLimitsFields";
import { WorkflowStepHeader } from "./WorkflowStepHeader";
import { WorkflowSurface } from "./WorkflowSurface";

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
    description: "Confirm the goal, worktree branch, participating agents, and guardrails before starting."
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
    return specs.find((spec) => spec.path === selectedSpecPath)?.title ?? "Project spec";
  }
  if (goalKind === "task") {
    return tasks.find((task) => task.path === selectedTaskPath)?.title ?? "Project task";
  }
  return "Custom instructions";
}

export function WorkflowRunSetup({ definition, onBack, onStarted }: WorkflowRunSetupProps) {
  const bots = useProjectBots(definition.projectId);
  const snapshot = useCanonicalAppSnapshot();
  // Plain (non-git) folders run the writer in the project folder instead of a managed worktree.
  const createsWorktree = !snapshot?.project || isGitProject(snapshot.project);
  const [step, setStep] = useState<LoopRunStep>("goal");
  const [goalKind, setGoalKind] = useState<LoopRunGoalKind>("spec");
  const [specs, setSpecs] = useState<WorkspaceSpecSummary[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTaskSummary[]>([]);
  const [selectedSpecPath, setSelectedSpecPath] = useState("");
  const [selectedTaskPath, setSelectedTaskPath] = useState("");
  const [objective, setObjective] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [limitsDraft, setLimitsDraft] = useState<LoopLimitsDraft>({
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
  }, [definition]);

  useEffect(() => {
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
  }, [definition]);

  const showSpecPicker = shouldShowLoopRunSpecPicker(selectedTemplateId);
  const showTaskPicker = shouldShowLoopRunTaskPicker(selectedTemplateId);
  const showReviewFeedbackPicker = shouldShowLoopRunReviewFeedbackPicker(selectedTemplateId);
  const reviewFeedback = useLoopRunReviewFeedback(definition.projectId, step === "goal");
  const reviewFeedbackReady = !showReviewFeedbackPicker || (
    reviewFeedback.selectedComments.length > 0
    && !reviewFeedback.isLoadingDetail
    && !reviewFeedback.isLoadingOverview
  );
  const goalReady = reviewFeedbackReady && isGoalReady(goalKind, selectedSpecPath, selectedTaskPath, objective);
  const limitsReady = isLoopLimitsDraftValid(limitsDraft);
  const worktreeReady = !createsWorktree || branchName.trim().length > 0;
  const canStart = goalReady && limitsReady && worktreeReady;
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
      setLimitsDraft(loopLimitsToDraft(definition.limits));
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
    if (!canStart) return;
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
        target: createsWorktree ? { kind: "new" } : { kind: "root" },
        worktreeBranch: createsWorktree
          ? {
              prefix: branchPrefix.trim() || DEFAULT_LOOP_WORKTREE_BRANCH_PREFIX,
              name: branchName.trim()
            }
          : null
      });
      onStarted(run);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start workflow.");
    } finally {
      setIsStarting(false);
    }
  }

  const agents = buildWorkflowAgentSummaries(definition.stages, snapshot?.agentCatalog ?? [], bots);
  const hasGoalSource = showSpecPicker || showTaskPicker || showReviewFeedbackPicker;

  return (
    <WorkflowSurface
      title={`Run ${definition.name}`}
      onBack={onBack}
      footer={<>
        <Button variant="outline" onClick={stepIndex === 0 ? () => onBack() : goBack}>
          {stepIndex > 0 ? <ArrowLeft className="size-4" aria-hidden="true" /> : null}
          {stepIndex === 0 ? "Cancel" : "Back"}
        </Button>
        {stepIndex < LOOP_RUN_STEPS.length - 1 ? <Button className="ml-auto" onClick={goForward} disabled={!isStepReady(step)}>
          Continue<ArrowRight className="size-4" aria-hidden="true" />
        </Button> : <Button className="ml-auto" disabled={isStarting || !canStart} onClick={() => void start()}>
          {isStarting ? "Starting…" : "Start workflow"}
        </Button>}
      </>}
    >
      <WizardProgress ariaLabel="Workflow run setup" steps={progressSteps} activeStep={step} onStepChange={setStep} />
      <WorkflowStepHeader title={stepCopy.title} description={stepCopy.description} />

      {step === "goal" ? <div className="space-y-5">
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
          <span className="text-xs font-normal text-muted-foreground">
            {selectedTemplate?.description ?? "Templates prefill the goal and sensible guardrails."}
          </span>
        </Field>
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
        <Field label={hasGoalSource ? "Additional instructions" : "Run goal"}>
          <Textarea
            autoFocus={!hasGoalSource}
            className="min-h-32 resize-none"
            placeholder={hasGoalSource
              ? "Optional extra guidance beyond the selected file…"
              : "Describe the outcome this run should accomplish…"}
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          />
        </Field>
      </div> : null}

      {step === "limits" ? <div className="space-y-4">
        <WorkflowLimitsFields value={limitsDraft} onChange={setLimitsDraft} />
        <p className="text-xs leading-5 text-muted-foreground">
          The workflow pauses when a limit is reached, keeping its {createsWorktree ? "worktree" : "changes"} and progress so you can inspect or resume it. The saved workflow's defaults stay unchanged.
        </p>
      </div> : null}

      {step === "review" ? <div className="space-y-8">
        {createsWorktree ? <section aria-labelledby="workflow-run-branch" className="space-y-3">
          <h3 id="workflow-run-branch" className="text-sm font-medium">Worktree branch</h3>
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
                placeholder={definition.name}
                required
              />
            </Field>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Creates <span className="font-mono text-foreground">{worktreeBranchPreview}</span> with a short unique suffix.
          </p>
        </section> : null}

        <section aria-labelledby="workflow-run-summary" className="space-y-3">
          <h3 id="workflow-run-summary" className="text-sm font-medium">Summary</h3>
          <WorkflowDetailList items={[
            ["Goal", sourceLabel],
            ...(objective.trim() ? [[goalKind === "custom" ? "Instructions" : "Additional instructions", <span className="whitespace-pre-wrap">{objective.trim()}</span>] as const] : []),
            ["Runs in", createsWorktree ? "A new managed worktree" : "The project folder"],
            ["Guardrails", `${limitsDraft.maxIterations} iterations · ${limitsDraft.maxDurationMinutes} min total · ${limitsDraft.roleTimeoutMinutes} min per agent`]
          ]} />
          <WorkflowAgentList agents={agents} />
          <p className="text-xs leading-5 text-muted-foreground">Nora opens the run as soon as it starts.</p>
        </section>
      </div> : null}

      {errorMessage ? <p role="alert" className="text-sm text-destructive">{errorMessage}</p> : null}
    </WorkflowSurface>
  );
}
