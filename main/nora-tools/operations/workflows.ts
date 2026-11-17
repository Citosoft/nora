import { findEffectiveBot } from "@shared/bots/catalog";
import type { LoopDefinition, LoopRoleDefinition, LoopRun } from "@shared/appTypes";
import { buildLoopLimitsFromDraft, DEFAULT_LOOP_LIMITS_DRAFT, loopLimitsToDraft } from "@shared/loopLimits";
import { DEFAULT_LOOP_WORKTREE_BRANCH_PREFIX } from "@shared/loopWorktree";
import type {
  NoraTaskOperations, NoraToolContext, NoraWorkflowOperations, WorkflowLimitsToolInput, WorkflowRoleToolInput, WorkflowRunControl
} from "@main/types/nora-tools/noraTools.types";
import type { NoraShellProject, NoraToolOperationOptions, NoraWorkflowStore } from "@main/types/nora-tools/operations.types";
import { shellProjectOf } from "./shellProject";

/**
 * Workflow tools act through the app's own workflow runner, so definitions are validated, saved and broadcast exactly as when
 * the user edits them in the Workflows tool; these operations only shape tool input into its payloads and resolve the workspace.
 */
export function createWorkflowOperations(options: NoraToolOperationOptions, tasks: NoraTaskOperations): NoraWorkflowOperations {
  const target = (context: NoraToolContext): { store: NoraWorkflowStore; project: NoraShellProject } => {
    if (!options.workflows) throw new Error("Workflows are unavailable here.");
    const project = shellProjectOf(options, context);
    if (!project) throw new Error("This thread's workspace has no workflows. Workflows belong to project workspaces.");
    return { store: options.workflows, project };
  };
  const definitionOf = async (store: NoraWorkflowStore, projectId: string, id: string): Promise<LoopDefinition> => {
    const definition = (await store.runner.listDefinitions(projectId)).find((entry) => entry.id === id);
    if (!definition) throw new Error(`No workflow with id "${id}" in this workspace. Call list_workflows for the ids.`);
    return definition;
  };
  const runOf = async (store: NoraWorkflowStore, projectId: string, runId: string): Promise<LoopRun> => {
    const run = await store.runner.getRun(projectId, runId);
    if (!run) throw new Error(`No workflow run with id "${runId}" in this workspace. Call list_workflows to see each workflow's latest run.`);
    return run;
  };
  const agentOf = (requested: string | undefined, context: NoraToolContext) => {
    const id = requested ?? context.conversation.provider.instanceId;
    const provider = options.boot().providers.find((entry) => entry.instanceId === id)
      ?? options.boot().providers.find((entry) => entry.kind === id);
    if (!provider || provider.kind === "nora") throw new Error(`No installed workflow provider matches "${id}".`);
    return provider;
  };
  const role = (input: WorkflowRoleToolInput, context: NoraToolContext): LoopRoleDefinition => {
    const boot = options.boot();
    const bot = input.botId ? findEffectiveBot(boot.personalization.bots, context.conversation.workspace.projectId, boot.sharedBots, input.botId) : null;
    if (input.botId && !bot) throw new Error(`No bot with id "${input.botId}" is available in this workspace.`);
    const provider = agentOf(bot?.binding.instanceId ?? input.agent, context);
    return { id: input.id ?? `stage-${options.nextId()}`, kind: input.kind, name: input.name,
      toolId: provider.kind, instanceId: provider.instanceId, model: bot?.binding.model ?? input.model ?? null,
      instructions: input.instructions, ...(input.reworkStageId ? { reworkStageId: input.reworkStageId } : {}), ...(bot ? { botId: bot.id } : {}) };
  };
  const limits = (base: LoopDefinition["limits"] | null, input: WorkflowLimitsToolInput | undefined): LoopDefinition["limits"] =>
    buildLoopLimitsFromDraft({ ...(base ? loopLimitsToDraft(base) : DEFAULT_LOOP_LIMITS_DRAFT), ...input });

  return {
    async report(input, context) {
      const source = context.conversation.source;
      if (source?.kind !== "workflow" || !options.workflows) throw new Error("Only a workflow stage thread can report its result.");
      await options.workflows.runner.reportStage({ ...input, projectId: source.projectId, runId: source.runId,
        roleId: source.stageId, conversationId: context.conversation.id });
    },
    async list(context) {
      const { store, project } = target(context);
      const [definitions, runs] = await Promise.all([store.runner.listDefinitions(project.id), store.runner.listRuns(project.id)]);
      // Runs come newest first, so the first match is each workflow's latest.
      return definitions.map((definition) => ({ definition, latestRun: runs.find((run) => run.definitionId === definition.id) ?? null }));
    },
    async create(input, context) {
      const { store, project } = target(context);
      return store.runner.saveDefinition({ projectId: project.id, definition: {
        id: `loop-${options.nextId()}`, name: input.name, description: input.description ?? "",
        stages: input.stages.map((stage) => role(stage, context)),
        limits: limits(null, input.limits)
      } });
    },
    async update(input, context) {
      const { store, project } = target(context);
      const existing = await definitionOf(store, project.id, input.id);
      return store.runner.saveDefinition({ projectId: project.id, definition: {
        ...existing,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        stages: input.stages ? input.stages.map((stage) => role(stage, context)) : existing.stages,
        limits: input.limits ? limits(existing.limits, input.limits) : existing.limits
      } });
    },
    async run(input, context) {
      const { store, project } = target(context);
      const definition = await definitionOf(store, project.id, input.id);
      const placement = store.runPlacement(project.id);
      if (placement === "unavailable") {
        throw new Error(`Workflows run in the workspace open in Nora's window. Open ${project.name} there, then try again.`);
      }
      const task = input.taskId ? (await tasks.read(input.taskId, context)).task : null;
      const objective = input.objective ?? "";
      if (!objective && !task) throw new Error("Give the run an objective, a task_id, or both.");
      const run = await store.runner.startRun({
        projectId: project.id, definitionId: definition.id, objective, taskPath: task?.path ?? null,
        target: placement === "worktree" ? { kind: "new" } : { kind: "root" },
        // Main slugifies the branch name and the runner makes it unique per run.
        worktreeBranch: placement === "worktree" ? { prefix: DEFAULT_LOOP_WORKTREE_BRANCH_PREFIX, name: task?.title ?? (objective || definition.name) } : null
      });
      // The runner records preparation failures on a paused run rather than throwing; report them as the failure they are.
      if (run.status === "paused" && !run.startedAt) throw new Error(`The workflow run could not start: ${run.stopReason ?? "unknown error"} (run id ${run.id}).`);
      return run;
    },
    async readRun(runId, context) {
      const { store, project } = target(context);
      return runOf(store, project.id, runId);
    },
    async controlRun(runId, action, context) {
      const { store, project } = target(context);
      const run = await runOf(store, project.id, runId);
      const controls: Record<WorkflowRunControl, (projectId: string, id: string) => Promise<LoopRun>> = {
        pause: store.runner.pauseRun, resume: store.runner.resumeRun, cancel: store.runner.cancelRun
      };
      return controls[action](project.id, run.id);
    }
  };
}
