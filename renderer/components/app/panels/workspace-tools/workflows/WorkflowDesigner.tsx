import { useProjectBots } from "@/components/app/hooks/useProjectBots";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import type { WorkflowDesignerProps } from "@/components/app/types/workflowSurface.types";
import type { LoopDefinitionDraft, LoopDesignerStep } from "@/components/app/types/loopDesigner.types";
import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { createModelCatalogStore } from "@/components/app/logic/modelCatalogStore";
import { buildWorkflowAgentSummaries } from "@/components/app/logic/workflowAgents";
import { moveWorkflowStage, newWorkflowStage } from "@/components/app/logic/workflowStages";
import { canReviewLoop, loopReworkError } from "@shared/loopStages";
import { buildLoopLimitsFromDraft, DEFAULT_LOOP_LIMITS_DRAFT, isLoopLimitsDraftValid, loopLimitsToDraft } from "@shared/loopLimits";
import { Field } from "@/components/app/shared/Field";
import { WizardProgress } from "@/components/app/shared/WizardProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowAgentList } from "./WorkflowAgentList";
import { WorkflowLimitsFields } from "./WorkflowLimitsFields";
import { WorkflowStageEditor } from "./WorkflowStageEditor";
import { WorkflowStepHeader } from "./WorkflowStepHeader";
import { WorkflowSurface } from "./WorkflowSurface";

const STEPS: LoopDesignerStep[] = ["basics", "stages", "limits"];
const COPY = {
  basics: { title: "Name the workflow", description: "Define a reusable process. Choose its goal each time you run it." },
  stages: { title: "Define the stages", description: "Add as many stages as you need, in the order they should run. Assign an agent or a saved bot to each one." },
  limits: { title: "Set guardrails", description: "Set runtime limits and review the stages before saving." }
};
function isStepValid(step: LoopDesignerStep, draft: LoopDefinitionDraft): boolean {
  switch (step) {
    case "basics": return !!draft.name.trim();
    case "stages": return draft.stages.length > 0 && draft.stages.every((stage) =>
      !!stage.name.trim() && !!stage.toolId && !!stage.instructions.trim() && (stage.kind !== "reviewer" || canReviewLoop(stage.toolId))) && !loopReworkError(draft.stages);
    case "limits": return isLoopLimitsDraftValid(draft);
  }
}

export function WorkflowDesigner({ projectId, agentCatalog, definition, onBack, onSaved }: WorkflowDesignerProps) {
  const { boot, store } = useNativeRuntimePorts();
  const tools = useMemo(() => agentCatalog.filter((tool) => boot.providers.some((provider) => provider.kind === tool.id)), [agentCatalog, boot.providers]);
  const workspace = boot.workspaces.find((entry) => entry.shellProjectId === projectId) ?? null;
  const nativeWorkspace = workspace?.workspace ?? null;
  const nativeWorkspaceKey = nativeWorkspace ? JSON.stringify(nativeWorkspace) : null;
  const catalogs = useMemo(() => nativeWorkspace ? createModelCatalogStore({ client: store.client, workspace: nativeWorkspace }) : null,
    [store.client, nativeWorkspaceKey]);
  const bots = useProjectBots(projectId);
  const [draft, setDraft] = useState<LoopDefinitionDraft>(() => definition ? {
    id: definition.id, name: definition.name, description: definition.description, stages: definition.stages,
    ...loopLimitsToDraft(definition.limits), createdAt: definition.createdAt
  } : { id: `loop-${crypto.randomUUID()}`, name: "Delivery workflow", description: "",
    stages: [newWorkflowStage(tools[0]?.id ?? "", 1)], ...DEFAULT_LOOP_LIMITS_DRAFT });
  const [expandedStageId, setExpandedStageId] = useState<string | null>(() => definition ? null : draft.stages[0]?.id ?? null);
  const [step, setStep] = useState<LoopDesignerStep>("basics");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const index = STEPS.indexOf(step);
  const valid = STEPS.every((entry) => isStepValid(entry, draft));
  const unavailableBot = draft.stages.some((stage) => stage.botId && !bots.some((bot) => bot.id === stage.botId));
  const addStage = () => {
    const stage = newWorkflowStage(tools[0]?.id ?? "", draft.stages.length + 1);
    setDraft((current) => ({ ...current, stages: [...current.stages, stage] }));
    setExpandedStageId(stage.id);
  };
  const save = async () => {
    if (!valid || unavailableBot) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      onSaved(await noraLoopClient.saveLoopDefinition({ projectId, definition: {
        id: draft.id, name: draft.name.trim(), description: draft.description.trim(),
        stages: draft.stages.map((stage) => ({ ...stage, name: stage.name.trim(), instructions: stage.instructions.trim() })),
        limits: buildLoopLimitsFromDraft(draft), ...(draft.createdAt ? { createdAt: draft.createdAt } : {})
      } }));
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Unable to save workflow."); }
    finally { setIsSaving(false); }
  };
  return <WorkflowSurface title={definition ? `Edit ${definition.name}` : "New workflow"} onBack={onBack} footer={<>
    <Button variant="outline" onClick={() => index ? setStep(STEPS[index - 1]) : onBack()}>
      {index ? <ArrowLeft className="size-4" aria-hidden="true" /> : null}{index ? "Back" : "Cancel"}
    </Button>
    {index < STEPS.length - 1 ? <Button className="ml-auto" disabled={!isStepValid(step, draft) || !tools.length}
      onClick={() => setStep(STEPS[index + 1])}>Continue<ArrowRight className="size-4" aria-hidden="true" /></Button>
      : <Button className="ml-auto" disabled={isSaving || !valid || unavailableBot || !tools.length} onClick={() => void save()}>
        {isSaving ? "Saving…" : definition ? "Save changes" : "Create workflow"}</Button>}
  </>}>
    <WizardProgress ariaLabel="Workflow setup" steps={STEPS.map((id) => ({ id, title: COPY[id].title }))} activeStep={step} onStepChange={setStep} />
    <WorkflowStepHeader {...COPY[step]} />
    {step === "basics" ? <div className="space-y-6">
      <Field label="Workflow name"><Input autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
      <Field label="Description (optional)"><Textarea className="min-h-24 resize-none" maxLength={2000} value={draft.description}
        onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></Field>
      <p className="text-sm leading-6 text-muted-foreground">Define the work end to end: implementation with Claude or Nora, code review with your review bot, then testing with your QA bot. Each stage receives earlier results and shares the same working files.</p>
    </div> : null}
    {step === "stages" ? <div className="space-y-4">
      <ol className="space-y-3">{draft.stages.map((stage, stageIndex) => <WorkflowStageEditor key={stage.id}
        stage={stage} stages={draft.stages} expanded={expandedStageId === stage.id}
        onToggle={() => setExpandedStageId((current) => current === stage.id ? null : stage.id)} index={stageIndex} count={draft.stages.length} bots={bots} tools={tools} providers={boot.providers} catalogs={catalogs}
        onChange={(partial) => setDraft((current) => ({ ...current, stages: current.stages.map((entry) => entry.id === stage.id ? { ...entry, ...partial } : entry) }))}
        onRemove={() => {
          setDraft((current) => ({ ...current, stages: current.stages.filter((entry) => entry.id !== stage.id) }));
          setExpandedStageId((current) => current === stage.id ? null : current);
        }}
        onMove={(direction) => setDraft((current) => ({ ...current, stages: moveWorkflowStage(current.stages, stageIndex, direction) }))} />)}</ol>
      <Button variant="outline" size="sm" disabled={!tools.length} onClick={addStage}>
        <Plus className="size-3.5" aria-hidden="true" />Add stage</Button>
      <p className="text-xs leading-5 text-muted-foreground">Stages run in order. Work stages can edit files; review stages inspect them. If a stage needs more work or requests changes, later stages wait and the workflow returns to that stage’s configured rework destination with feedback. It continues until every stage succeeds or a guardrail is reached.</p>
    </div> : null}
    {step === "limits" ? <div className="space-y-8">
      <WorkflowLimitsFields value={draft} onChange={(limits) => setDraft((current) => ({ ...current, ...limits }))} />
      <WorkflowAgentList agents={buildWorkflowAgentSummaries(draft.stages, tools, bots)} />
    </div> : null}
    {!tools.length ? <p role="alert" className="text-sm text-destructive">Install a thread provider before creating a workflow.</p> : null}
    {unavailableBot ? <p role="alert" className="text-sm text-destructive">A selected bot is unavailable. Choose another bot or agent.</p> : null}
    {errorMessage ? <p role="alert" className="text-sm text-destructive">{errorMessage}</p> : null}
  </WorkflowSurface>;
}
