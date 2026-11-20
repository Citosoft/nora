import assert from "node:assert/strict";
import { createLoopRunner } from "@main/loops/loopRunner";
import { normalizeLoopDefinition } from "@main/loops/loopValidation";
import type { LoopDefinition, LoopRoleDefinition, LoopRun, LoopRoleOutcome } from "@shared/appTypes";
import type { LoopFixtureOptions } from "../../types/loopFixture.types";

export const stage = (id: string, kind: "writer" | "reviewer" = "writer"): LoopRoleDefinition => ({
  id, kind, name: id, toolId: "claude", model: null, instructions: `Perform ${id}.`
});
export function definition(stages: LoopRoleDefinition[] = [stage("implementation")]): LoopDefinition {
  return normalizeLoopDefinition({ projectId: "project", definition: { id: "workflow", name: "Delivery", description: "",
    stages, limits: { maxIterations: 2, maxDurationMs: 300_000, roleTimeoutMs: 900_000 } } }, new Date().toISOString());
}
export function workflowResult(prompt: string, outcome: LoopRoleOutcome = "complete", summary = "Done") {
  const token = prompt.match(/attempt_id: "([^"]+)"/)?.[1];
  assert.ok(token);
  return { output: summary, report: { attemptId: token, outcome, summary } };
}
export function loopFixture(options: LoopFixtureOptions = {}) {
  const saved = options.definition ?? definition();
  const runs = new Map<string, LoopRun>();
  const broadcasts: LoopDefinition[] = [];
  const branches: string[] = [];
  let id = 0;
  const store = { listDefinitions: async () => [saved], saveDefinition: async () => {}, deleteDefinition: async () => {},
    listRuns: async () => [...runs.values()], getRun: async (_project: string, runId: string) => runs.get(runId) ?? null,
    saveRun: async (run: LoopRun) => { runs.set(run.id, structuredClone(run)); }, deleteRun: async (_project: string, runId: string) => { runs.delete(runId); } };
  const runner = createLoopRunner({ store, resolveBot: options.resolveBot,
    nowIso: options.nowIso ?? (() => new Date().toISOString()), randomId: () => `id-${++id}`,
    prepareWorktree: options.prepareWorktree ?? (async ({ payload, onProgress }) => {
      branches.push(payload.worktreeBranch?.name ?? "root");
      await onProgress?.("Preparing checkout…");
      return { worktreePath: "/tmp/workflow", sessionId: "session", worktreeId: "tree" };
    }),
    runtime: { prepare: options.prepare ?? (async (run) => run.roles.map((role) => ({ ...role, conversationId: `thread:${run.id}:${role.roleId}` }))),
      execute: async (input) => {
        const result = options.execute ? await options.execute(input) : { status: "completed" as const, ...workflowResult(input.prompt), failure: null };
        if (result.report) {
          const current = [...runs.values()].find((run) => run.roles.some((role) => role.conversationId === input.conversationId));
          assert.ok(current?.activeRoleId);
          await runner.reportStage({ ...result.report, projectId: current.projectId, runId: current.id,
            roleId: current.activeRoleId, conversationId: input.conversationId });
        }
        return result;
      } },
    notifyRunChanged: () => {}, notifyRunDeleted: () => {}, notifyRunOutput: () => {}, notifyDefinitionChanged: (value) => broadcasts.push(value),
    resolveWorkspaceStatePath: async (_project, path) => path
  });
  return { runner, runs, store, broadcasts, branches, definition: saved,
    start: () => runner.startRun({ projectId: "project", definitionId: saved.id, objective: "Ship", target: { kind: "root" }, worktreeBranch: { prefix: "workflow", name: "delivery" } }) };
}
export async function until(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 3000;
  while (!predicate() && Date.now() < deadline) await new Promise<void>((resolve) => setTimeout(resolve, 5));
  assert.ok(predicate(), "Workflow did not reach the expected state");
}
