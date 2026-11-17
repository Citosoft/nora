import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LoopDefinition, LoopRoleDefinition, LoopRun } from "@shared/appTypes";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import { loopLimitsToDraft } from "@shared/loopLimits";
import type { NoraToolContext, NoraToolDeps, WorkflowLimitsToolInput } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";

const SUMMARY_CHARS = 1_500;
const EVENTS_SHOWN = 8;

const roleFields = {
  id: z.string().min(1).max(200).optional().describe("Stable stage id, required when another stage names this as its reworkStageId"),
  kind: z.enum(["writer", "reviewer"]).describe("writer performs work (implementation, testing, changes); reviewer checks read-only and approves or requests changes"),
  reworkStageId: z.string().min(1).max(200).optional().describe("ID of an earlier work stage to retry if this stage fails; omit to return to stage 1"),
  botId: z.string().min(1).max(64).optional().describe("Saved bot id from list_bots; uses its provider, model and instructions"),
  name: z.string().trim().min(1).max(200).describe("Role name shown in the Workflows tool, e.g. Implementer or Security reviewer"),
  agent: z.string().trim().min(1).max(200).optional().describe("Installed provider kind or instance id; omit to use this thread's provider"),
  model: z.string().trim().min(1).max(512).nullable().optional().describe("Model id for that agent; omit or null for the agent's default"),
  instructions: z.string().trim().min(1).max(20_000).describe("What this role does each turn, in the second person")
};
const roleSchema = z.object(roleFields).strict();
const limitsSchema = z.object({
  max_iterations: z.number().int().min(1).max(100).optional().describe("Full stage passes before the run pauses (default 10)"),
  max_duration_minutes: z.number().int().min(5).max(1440).optional().describe("Total run time before it pauses (default 240)"),
  role_timeout_minutes: z.number().int().min(1).max(240).optional().describe("Longest a single agent turn may take (default 30)")
}).strict();
const workflowId = z.string().trim().min(1).max(200).describe("Workflow id from list_workflows");
const runId = z.string().trim().min(1).max(200).describe("Workflow run id from run_workflow or list_workflows");

const limitsInput = (limits: z.infer<typeof limitsSchema> | undefined): WorkflowLimitsToolInput | undefined => limits && {
  ...(limits.max_iterations !== undefined ? { maxIterations: limits.max_iterations } : {}),
  ...(limits.max_duration_minutes !== undefined ? { maxDurationMinutes: limits.max_duration_minutes } : {}),
  ...(limits.role_timeout_minutes !== undefined ? { roleTimeoutMinutes: limits.role_timeout_minutes } : {})
};
const clip = (text: string): string => text.length > SUMMARY_CHARS ? `${text.slice(0, SUMMARY_CHARS)}…` : text;
const roleLine = (role: Pick<LoopRoleDefinition, "name" | "toolId" | "model">): string => `${role.name} (${role.toolId}${role.model ? ` / ${role.model}` : ""})`;

function describeWorkflow(definition: LoopDefinition): string {
  const limits = loopLimitsToDraft(definition.limits);
  return [`${definition.name} (id ${definition.id})${definition.description ? ` — ${definition.description}` : ""}`,
    `  stages: ${definition.stages.map((stage) => `${roleLine(stage)} [id ${stage.id}, ${stage.kind}${stage.reworkStageId ? `, rework to ${stage.reworkStageId}` : ""}${stage.botId ? `, bot ${stage.botId}` : ""}]`).join(" → ")}`,
    `  limits: ${limits.maxIterations} iterations, ${limits.maxDurationMinutes} min total, ${limits.roleTimeoutMinutes} min per turn`].join("\n");
}

function describeRun(run: LoopRun): string {
  const iteration = run.iterations.at(-1);
  const goal = [run.taskPath ? `task ${run.taskPath}` : null, run.specPath ? `spec ${run.specPath}` : null, run.objective || null].filter(Boolean).join("; ");
  const active = run.roles.find((role) => role.roleId === run.activeRoleId);
  const results = iteration?.results ?? [];
  return [
    `${run.definition.name} run ${run.id}: ${run.status}${run.stopReason ? ` (${run.stopReason})` : ""}`,
    `Goal: ${goal || "none"}`,
    `Iteration ${iteration?.number ?? 0} of ${run.limits.maxIterations}${active ? `; ${active.name} is working` : ""}`,
    `Runs in: ${run.worktreePath ?? "not prepared yet"}`,
    ...(results.length ? ["Latest results:", ...results.map((result) => {
      const role = run.roles.find((entry) => entry.roleId === result.roleId);
      return `- ${role?.name ?? result.roleId}: ${result.outcome} — ${clip(result.summary)}`;
    })] : []),
    "Recent events:", ...run.events.slice(-EVENTS_SHOWN).map((event) => `- ${event.createdAt} ${event.message}`)
  ].join("\n");
}

export function registerWorkflowTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("list_workflows", { ...NORA_TOOLS.list_workflows, annotations: { readOnlyHint: true, openWorldHint: false } }, () => runTool(async () => {
    const workflows = await deps.workflows.list(context);
    if (!workflows.length) return "This workspace has no workflows yet.";
    return workflows.map(({ definition, latestRun }) => `- ${describeWorkflow(definition)}\n  latest run: ${latestRun
      ? `${latestRun.id}, ${latestRun.status}, updated ${latestRun.updatedAt}` : "never run"}`).join("\n");
  }));
  server.registerTool("create_workflow", { ...NORA_TOOLS.create_workflow,
    inputSchema: {
      name: z.string().trim().min(1).max(200).describe("Short workflow name, e.g. Implement and review"),
      description: z.string().trim().max(2_000).optional().describe("What the workflow is for"),
      stages: z.array(roleSchema).min(1).describe("Ordered stages; any number of work and review stages, each assigned an agent or saved bot"),
      limits: limitsSchema.optional()
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => {
    const definition = await deps.workflows.create({ ...input, limits: limitsInput(input.limits) }, context);
    return `Created workflow:\n${describeWorkflow(definition)}\nIt now appears in the Workflows tool. Start it with run_workflow.`;
  }));
  server.registerTool("update_workflow", { ...NORA_TOOLS.update_workflow,
    inputSchema: {
      id: workflowId,
      name: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(2_000).optional(),
      stages: z.array(roleSchema).min(1).optional().describe("Replaces the complete ordered stage list"),
      limits: limitsSchema.optional()
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => runTool(async () => {
    const definition = await deps.workflows.update({ ...input, limits: limitsInput(input.limits) }, context);
    return `Updated workflow:\n${describeWorkflow(definition)}\nNew runs use these changes.`;
  }));
  server.registerTool("run_workflow", { ...NORA_TOOLS.run_workflow,
    inputSchema: {
      id: workflowId,
      objective: z.string().trim().min(1).max(20_000).optional().describe("What the run should achieve, with any context; extra instructions when task_id is given"),
      task_id: z.string().trim().min(1).max(1024).optional().describe("Stable task id from list_tasks to use as the run's goal")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => {
    const run = await deps.workflows.run({ id: input.id, ...(input.objective ? { objective: input.objective } : {}), ...(input.task_id ? { taskId: input.task_id } : {}) }, context);
    return `Started ${run.definition.name} (run id ${run.id}) in ${run.worktreePath ?? "the project folder"}. `
      + "It runs in the background and appears in the Workflows tool; check it with read_workflow_run.";
  }));
  server.registerTool("read_workflow_run", { ...NORA_TOOLS.read_workflow_run, inputSchema: { id: runId },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(async () => describeRun(await deps.workflows.readRun(input.id, context))));
  server.registerTool("control_workflow_run", { ...NORA_TOOLS.control_workflow_run,
    inputSchema: { id: runId, action: z.enum(["pause", "resume", "cancel"]).describe("pause, resume or cancel") },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => runTool(async () => {
    const run = await deps.workflows.controlRun(input.id, input.action, context);
    return `${run.definition.name} run ${run.id} is now ${run.status}${run.stopReason ? ` (${run.stopReason})` : ""}.`;
  }));
}

/** The thread-scoped bearer token supplies ownership; the attempt id rejects late reports from interrupted attempts. */
export function registerWorkflowReportTool(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("report_workflow_stage", { ...NORA_TOOLS.report_workflow_stage,
    inputSchema: { attempt_id: z.string().min(1).max(512), outcome: z.enum(["complete", "continue", "approve", "changes_requested"]),
      summary: z.string().trim().min(1).max(20_000) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => runTool(async () => {
    await deps.workflows.report({ attemptId: input.attempt_id, outcome: input.outcome, summary: input.summary }, context);
    return "Stage result recorded. Finish this turn; the workflow advances only after the runtime completes it successfully.";
  }));
}
