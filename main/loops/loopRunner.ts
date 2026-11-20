import type {
  LoopIteration,
  LoopOutputEvent,
  LoopOutputEventPayload,
  LoopRun,
  LoopRunEvent,
  LoopRunRole,
  SaveLoopDefinitionPayload,
  StartLoopRunPayload
} from "@shared/appTypes";
import { assertLoopReviewer, loopReworkResults } from "@shared/loopStages";
import { createLoopPersistence } from "./runPersistence";
import { normalizeLoopRunGoal, resolveLoopRunGoalAttachmentPath, type LoopRunGoal } from "@shared/loopRunGoal";
import { resolveLoopRunLimits } from "@shared/loopLimits";
import { isLoopRunDeletable, LOOP_USER_STOP_REASONS } from "@shared/loopRunLifecycle";
import type { LoopRunner, LoopRunnerDeps, LoopStageResult, ResolvedLoopStage, LoopStageReport } from "@main/types/loopRunner.types";
import type { PrepareLoopRunWorktreeInput } from "@main/types/prepareLoopRunWorktree.types";
import { resolveLoopStages } from "./resolveLoopStages";
import { normalizeLoopDefinition } from "./loopValidation";
import { buildStagePrompt } from "./loopProtocol";

const MAX_OUTPUT_LOG_CHARS = 500_000;
const MAX_OUTPUT_EVENTS = 2_000;

function runGoal(run: LoopRun): LoopRunGoal {
  return {
    objective: run.objective,
    specPath: run.specPath,
    taskPath: run.taskPath,
    handoffPath: run.handoffPath
  };
}

function event(deps: LoopRunnerDeps, kind: LoopRunEvent["kind"], message: string, roleId: string | null, iteration: number | null): LoopRunEvent {
  return { id: deps.randomId(), kind, createdAt: deps.nowIso(), message, roleId, iteration };
}

function appendRunOutput(run: LoopRun, chunk: string, events: LoopOutputEvent[]): LoopRun {
  if (!chunk && events.length === 0) {
    return run;
  }
  return {
    ...run,
    outputLog: `${run.outputLog}${chunk}`.slice(-MAX_OUTPUT_LOG_CHARS),
    outputEvents: [...run.outputEvents, ...events].slice(-MAX_OUTPUT_EVENTS)
  };
}

function withUniqueRunBranch(payload: StartLoopRunPayload, runId: string): StartLoopRunPayload {
  if (!payload.worktreeBranch) {
    return payload;
  }
  return {
    ...payload,
    worktreeBranch: {
      ...payload.worktreeBranch,
      name: `${payload.worktreeBranch.name}-${runId.slice(0, 8)}`
    }
  };
}

export function createLoopRunner(deps: LoopRunnerDeps): LoopRunner {
  const activeRuns = new Map<string, Promise<void>>();
  const stageReports = new Map<string, LoopStageReport>();
  const activeTurns = new Map<string, { abort: () => void }>();
  const preparingRuns = new Map<string, AbortController>();
  const rescheduleRuns = new Set<string>();
  let disposed = false;
  const persistence = createLoopPersistence(deps);
  const persist = persistence.save;
  const updateRun = persistence.update;

  async function pauseWithError(run: LoopRun, message: string): Promise<LoopRun> {
    return updateRun(run, {
      status: "paused",
      stopReason: message,
      activeRoleId: null,
      activeToken: null,
      events: [...run.events, event(deps, "error", message, run.activeRoleId, run.iterations.at(-1)?.number ?? null)]
    });
  }

  async function recoverOrphanedRun(run: LoopRun): Promise<LoopRun> {
    const wasActive = run.status === "preparing" || run.status === "running" || run.status === "pausing";
    if (!wasActive || (activeRuns.has(run.id) || preparingRuns.has(run.id))) {
      return run;
    }
    return updateRun(run, {
      status: "paused",
      stopReason: "Nora closed while this workflow was active.",
      activeRoleId: null,
      activeToken: null,
      events: [...run.events, event(
        deps,
        "paused",
        "Workflow paused after Nora restarted.",
        null,
        run.iterations.at(-1)?.number ?? null
      )]
    });
  }

  function emitOutput(run: LoopRun, chunk: string, events: LoopOutputEvent[] = []): LoopRun {
    const nextRun = appendRunOutput(run, chunk, events);
    if (events.length > 0) {
      deps.notifyRunOutput({ projectId: nextRun.projectId, runId: nextRun.id, events });
    }
    return nextRun;
  }

  function outputEvent(
    role: LoopRunRole,
    turnId: string,
    iteration: number,
    value: LoopOutputEventPayload
  ): LoopOutputEvent {
    return {
      ...value,
      id: deps.randomId(),
      turnId,
      roleId: role.roleId,
      roleName: role.name,
      roleKind: role.kind,
      toolId: role.toolId,
      iteration,
      createdAt: deps.nowIso()
    } as LoopOutputEvent;
  }

  async function appendGoalContext(run: LoopRun, prompt: string): Promise<string> {
    const attachmentPath = resolveLoopRunGoalAttachmentPath(runGoal(run));
    if (!attachmentPath) {
      return prompt;
    }
    const absolutePath = await deps.resolveWorkspaceStatePath(run.projectId, attachmentPath);
    return `${prompt}\n\nAttached run goal file:\n${absolutePath}`;
  }

  async function runThreadTurn(run: LoopRun, role: LoopRunRole, prompt: string, token: string): Promise<LoopStageResult> {
    if (!role.conversationId) throw new Error(`${role.name}'s workflow thread is missing.`);
    const deadline = run.startedAt ? Date.parse(run.startedAt) + run.limits.maxDurationMs : 0;
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("The workflow reached its total duration limit.");
    const resolvedPrompt = await appendGoalContext(run, prompt.replaceAll("__NORA_LOOP_TOKEN__", token));
    const iteration = run.iterations.at(-1)?.number ?? 1;
    const turnId = deps.randomId();
    let streamedOutput = false;
    let liveRun = emitOutput(run, "", [outputEvent(role, turnId, iteration, {
      kind: "turn",
      phase: "started",
      exitCode: null,
      aborted: false
    })]);
    run.outputLog = liveRun.outputLog;
    run.outputEvents = liveRun.outputEvents;
    await persist(liveRun);

    const controller = new AbortController();
    activeTurns.set(run.id, { abort: () => controller.abort() });
    try {
      const controlRun = await deps.store.getRun(run.projectId, run.id);
      if (disposed || controlRun?.status !== "running") throw new Error("Workflow execution was stopped.");
      const budget = deadline - Date.now();
      if (budget <= 0) throw new Error("The workflow reached its total duration limit.");
      const result = await deps.runtime.execute({
        conversationId: role.conversationId, prompt: resolvedPrompt,
        timeoutMs: Math.min(run.limits.roleTimeoutMs, budget), signal: controller.signal,
        onOutput: (chunk) => {
          streamedOutput = true;
          liveRun = emitOutput(liveRun, chunk, [outputEvent(role, turnId, iteration, { kind: "message", markdown: chunk })]);
          run.outputLog = liveRun.outputLog;
          run.outputEvents = liveRun.outputEvents;
          void persistence.output(liveRun).catch(() => controller.abort());
        }
      });
      const normalizedEvents = !streamedOutput && result.output ? [outputEvent(role, turnId, iteration, { kind: "message", markdown: result.output })] : [];
      const turnFinished = outputEvent(role, turnId, iteration, {
        kind: "turn",
        phase: "finished",
        exitCode: null,
        aborted: result.status === "interrupted" || result.status === "timed-out"
      });
      const diagnostic = `\n[${role.name} thread ${result.status}]\n`;
      liveRun = emitOutput(liveRun, diagnostic, [...normalizedEvents, turnFinished]);
      run.outputLog = liveRun.outputLog;
      run.outputEvents = liveRun.outputEvents;
      liveRun = await updateRun(liveRun, {
        outputLog: liveRun.outputLog,
        outputEvents: liveRun.outputEvents
      });

      if (liveRun.status !== "running") throw new Error("Workflow execution was stopped.");
      if (result.status !== "completed") throw new Error(result.failure ?? `${role.name}'s thread ${result.status}.`);
      if (run.startedAt && Date.now() >= Date.parse(run.startedAt) + run.limits.maxDurationMs) {
        throw new Error("The workflow reached its total duration limit.");
      }

      const parsed = stageReports.get(run.id)?.result;
      if (!parsed) throw new Error(`${role.name} finished without reporting its result through report_workflow_stage.`);
      liveRun = emitOutput(liveRun, "", [outputEvent(role, turnId, iteration, { kind: "result", token, ...parsed })]);
      await updateRun(liveRun, { outputLog: liveRun.outputLog, outputEvents: liveRun.outputEvents });
      return parsed;
    } finally {
      activeTurns.delete(run.id);
    }
  }

  async function waitForResult(run: LoopRun, role: LoopRunRole, prompt: string): Promise<LoopStageResult> {
    const token = deps.randomId();
    const liveRun = await updateRun(run, {
      activeRoleId: role.roleId,
      activeToken: token,
      events: [...run.events, event(deps, "role_started", `${role.name} started.`, role.roleId, run.iterations.at(-1)?.number ?? null)]
    });
    run.status = liveRun.status;
    run.activeRoleId = role.roleId;
    run.activeToken = token;
    run.events = liveRun.events;
    run.outputLog = liveRun.outputLog;
    run.outputEvents = liveRun.outputEvents;

    if (liveRun.status !== "running") throw new Error("Workflow execution was stopped.");
    stageReports.set(run.id, { attemptId: token, result: null });
    try { return await runThreadTurn(liveRun, role, prompt, token); }
    finally { stageReports.delete(run.id); }
  }

  function buildRoles(stages: readonly ResolvedLoopStage[]): LoopRunRole[] {
    return stages.map(({ id, ...stage }) => ({ ...stage, roleId: id }));
  }

  async function execute(runId: string, projectId: string): Promise<void> {
    let run = await deps.store.getRun(projectId, runId);
    if (!run || disposed) {
      return;
    }
    try {
      while (run.status === "running") {
        if (run.startedAt && Date.now() - Date.parse(run.startedAt) >= run.limits.maxDurationMs) {
          run = await pauseWithError(run, "The workflow reached its total duration limit.");
          break;
        }
        const unfinished = run.iterations.at(-1)?.completedAt === null ? run.iterations.at(-1) : undefined;
        if (!unfinished && run.iterations.length >= run.limits.maxIterations) {
          run = await pauseWithError(run, "The workflow reached its iteration limit.");
          break;
        }

        const iteration: LoopIteration = unfinished ?? {
          number: run.iterations.length + 1,
          startedAt: deps.nowIso(),
          completedAt: null,
          results: loopReworkResults(run.roles, run.iterations.at(-1))
        };
        if (!unfinished) run = await updateRun(run, { iterations: [...run.iterations, iteration] });

        const previous = run.iterations.length > 1 ? run.iterations.at(-2) : undefined;
        let needsRework = iteration.results.some((result) => result.outcome === "continue" || result.outcome === "changes_requested");
        for (const stage of run.roles) {
          if (needsRework || run.status !== "running") break;
          if (iteration.results.some((result) => result.roleId === stage.roleId)) continue;
          if (run.startedAt && Date.now() - Date.parse(run.startedAt) >= run.limits.maxDurationMs) {
            throw new Error("The workflow reached its total duration limit.");
          }
          const parsed = await waitForResult(run, stage,
            buildStagePrompt(run.definition, stage, runGoal(run), previous, iteration, "__NORA_LOOP_TOKEN__"));
          const allowed = stage.kind === "writer"
            ? parsed.outcome === "complete" || parsed.outcome === "continue"
            : parsed.outcome === "approve" || parsed.outcome === "changes_requested";
          if (!allowed) throw new Error(`${stage.name} returned an invalid outcome for its stage type.`);
          needsRework = parsed.outcome === "continue" || parsed.outcome === "changes_requested";
          iteration.results.push({ roleId: stage.roleId, outcome: parsed.outcome,
            summary: parsed.summary, completedAt: deps.nowIso() });
          run = await updateRun(run, {
            activeRoleId: null, activeToken: null,
            iterations: [...run.iterations.slice(0, -1), iteration],
            events: [...run.events, event(deps, "role_finished", `${stage.name}: ${parsed.outcome}.`, stage.roleId, iteration.number)]
          });
        }

        if (needsRework || iteration.results.length === run.roles.length) iteration.completedAt = deps.nowIso();
        const approved = iteration.results.length === run.roles.length
          && iteration.results.every((result) => result.outcome === "complete" || result.outcome === "approve");
        if (run.status === "running" && approved) {
          run = await updateRun(run, {
            status: "completed",
            stopReason: "All workflow stages completed successfully.",
            completedAt: deps.nowIso(),
            iterations: [...run.iterations.slice(0, -1), iteration],
            events: [...run.events, event(deps, "completed", "Workflow completed.", null, iteration.number)]
          });
          break;
        }

        if (run.status === "pausing") {
          run = await updateRun(run, {
            status: "paused",
            stopReason: LOOP_USER_STOP_REASONS.paused,
            iterations: [...run.iterations.slice(0, -1), iteration],
            events: [...run.events, event(deps, "paused", "Workflow paused.", null, iteration.number)]
          });
        } else if (run.status === "running") {
          run = await updateRun(run, { iterations: [...run.iterations.slice(0, -1), iteration] });
        }
      }
    } catch (error) {
      const latest = await deps.store.getRun(projectId, runId);
      if (latest?.status === "pausing") {
        await updateRun(latest, {
          status: "paused",
          stopReason: LOOP_USER_STOP_REASONS.paused,
          activeRoleId: null,
          activeToken: null,
          events: [...latest.events, event(
            deps,
            "paused",
            "Workflow paused.",
            null,
            latest.iterations.at(-1)?.number ?? null
          )]
        });
      } else if (latest?.status === "running" || latest?.status === "preparing") {
        await pauseWithError(latest, error instanceof Error ? error.message : String(error));
      }
    }
  }

  function schedule(run: LoopRun): void {
    if (disposed || run.status !== "running") return;
    if (activeRuns.has(run.id)) { rescheduleRuns.add(run.id); return; }
    const pending = execute(run.id, run.projectId).finally(async () => {
      activeRuns.delete(run.id);
      if (rescheduleRuns.delete(run.id)) {
        const latest = await deps.store.getRun(run.projectId, run.id);
        if (latest) schedule(latest);
      }
    });
    activeRuns.set(run.id, pending);
    void pending.catch(() => undefined);
  }

  return {
    async reportStage(input) {
      const pending = stageReports.get(input.runId);
      const run = await deps.store.getRun(input.projectId, input.runId);
      const role = run?.roles.find((entry) => entry.roleId === input.roleId);
      if (!pending || !run || run.status !== "running" || run.activeRoleId !== input.roleId || pending.attemptId !== input.attemptId
        || run.activeToken !== input.attemptId || role?.conversationId !== input.conversationId) {
        throw new Error("This stage attempt is no longer active, or the report belongs to another workflow thread.");
      }
      if (run.startedAt && Date.now() >= Date.parse(run.startedAt) + run.limits.maxDurationMs) throw new Error("The workflow reached its total duration limit.");
      const valid = role.kind === "writer" ? input.outcome === "complete" || input.outcome === "continue"
        : input.outcome === "approve" || input.outcome === "changes_requested";
      if (!valid) throw new Error(`${role.name} returned an invalid outcome for its stage type.`);
      const summary = input.summary.trim();
      if (!summary || summary.length > 20_000) throw new Error("Stage summaries must contain 1 to 20000 characters.");
      if (pending.result && (pending.result.outcome !== input.outcome || pending.result.summary !== summary)) {
        throw new Error("This attempt already reported a different result.");
      }
      pending.result = { outcome: input.outcome, summary };
    },
    listDefinitions: (projectId) => deps.store.listDefinitions(projectId),
    async saveDefinition(payload: SaveLoopDefinitionPayload) {
      const definition = normalizeLoopDefinition(payload, deps.nowIso());
      await deps.store.saveDefinition(definition);
      deps.notifyDefinitionChanged(definition);
      return definition;
    },
    deleteDefinition: (projectId, definitionId) => deps.store.deleteDefinition(projectId, definitionId),
    async listRuns(projectId) {
      return Promise.all((await deps.store.listRuns(projectId)).map(recoverOrphanedRun));
    },
    async getRun(projectId, runId) {
      const run = await deps.store.getRun(projectId, runId);
      return run ? recoverOrphanedRun(run) : null;
    },
    async deleteRun(projectId, runId) {
      const run = await deps.store.getRun(projectId, runId);
      if (!run) {
        return;
      }
      if (!isLoopRunDeletable(run.status)) {
        throw new Error("Pause or cancel this workflow run before deleting it.");
      }
      await deps.store.deleteRun(projectId, runId);
      deps.notifyRunDeleted(projectId, runId);
    },
    async startRun(payload: StartLoopRunPayload) {
      const savedDefinition = (await deps.store.listDefinitions(payload.projectId)).find((item) => item.id === payload.definitionId);
      if (!savedDefinition) {
        throw new Error("Workflow could not be found.");
      }
      const resolved = resolveLoopStages(savedDefinition.stages, payload.projectId, deps.resolveBot);
      const definition = structuredClone(savedDefinition);

      for (const role of resolved) {
        if (role.kind === "reviewer") assertLoopReviewer(role.toolId, role.name);
      }

      const goal = normalizeLoopRunGoal(payload);
      const limits = resolveLoopRunLimits(definition.limits, payload.limits);
      let run: LoopRun = {
        id: deps.randomId(),
        projectId: payload.projectId,
        definitionId: definition.id,
        definition: structuredClone(definition),
        objective: goal.objective,
        specPath: goal.specPath,
        taskPath: goal.taskPath,
        handoffPath: goal.handoffPath,
        limits,
        status: "preparing",
        stopReason: null,
        sessionId: null,
        worktreeId: null,
        worktreePath: null,
        outputLog: "",
        outputEvents: [],
        roles: buildRoles(resolved),
        iterations: [],
        events: [event(deps, "created", "Workflow run created.", null, null)],
        activeRoleId: null,
        activeToken: null,
        createdAt: deps.nowIso(),
        startedAt: null,
        updatedAt: deps.nowIso(),
        completedAt: null
      };
      const preparation = new AbortController();
      preparingRuns.set(run.id, preparation);
      try {
        await persist(run);
        const prepInput: PrepareLoopRunWorktreeInput = {
          payload: withUniqueRunBranch(payload, run.id),
          toolId: definition.stages[0].toolId,
          name: definition.stages[0].name,
          onProgress: async (message) => {
            const firstStage = run.roles[0];
            const progressEvents = firstStage ? [outputEvent(firstStage, `prepare-${run.id}`, 0, {
              kind: "notice",
              tone: "info",
              message
            })] : [];
            run = emitOutput(run, `${message}\n`, progressEvents);
            run = await persist(run);
          }
        };
        const prepared = await deps.prepareWorktree(prepInput);
        run = await updateRun(run, {
          sessionId: prepared.sessionId,
          worktreeId: prepared.worktreeId,
          worktreePath: prepared.worktreePath,
          outputLog: run.outputLog,
          outputEvents: run.outputEvents,
          startedAt: deps.nowIso(),
          stopReason: null,
          events: [...run.events, event(deps, "resumed", "Workflow threads prepared.", null, null)]
        });
        if (preparation.signal.aborted || run.status !== "preparing") return run;
        const roles = await deps.runtime.prepare(run, preparation.signal);
        run = await updateRun(run, { roles, status: preparation.signal.aborted ? "cancelled" : "running" });
        schedule(run);
        return run;
      } catch (error) {
        return pauseWithError(run, error instanceof Error ? error.message : String(error));
      } finally { preparingRuns.delete(run.id); }
    },
    async pauseRun(projectId, runId) {
      const run = await deps.store.getRun(projectId, runId);
      if (!run) {
        throw new Error("Workflow run could not be found.");
      }
      if (run.status !== "running") {
        return run;
      }
      if (!run.activeRoleId) {
        return updateRun(run, {
          status: "paused",
          stopReason: LOOP_USER_STOP_REASONS.paused,
          events: [...run.events, event(
            deps,
            "paused",
            "Workflow paused.",
            null,
            run.iterations.at(-1)?.number ?? null
          )]
        });
      }
      const pausing = await updateRun(run, { status: "pausing", stopReason: LOOP_USER_STOP_REASONS.pausing });
      activeTurns.get(runId)?.abort();
      return pausing;
    },
    async resumeRun(projectId, runId) {
      const run = await deps.store.getRun(projectId, runId);
      if (!run) {
        throw new Error("Workflow run could not be found.");
      }
      if (run.status !== "paused") {
        return run;
      }
      if (!run.worktreePath) {
        throw new Error("Workflow worktree is missing. Start a new workflow run instead of resuming this one.");
      }
      const preparation = new AbortController();
      preparingRuns.set(run.id, preparation);
      let roles: LoopRunRole[];
      try { roles = await deps.runtime.prepare(run, preparation.signal); }
      finally { preparingRuns.delete(run.id); }
      if (preparation.signal.aborted) return await deps.store.getRun(projectId, runId) ?? run;
      const resumed = await updateRun(run, {
        roles,
        status: "running",
        stopReason: null,
        events: [...run.events, event(deps, "resumed", "Workflow resumed.", null, run.iterations.at(-1)?.number ?? null)]
      });
      schedule(resumed);
      return resumed;
    },
    async cancelRun(projectId, runId) {
      const run = await deps.store.getRun(projectId, runId);
      if (!run) {
        throw new Error("Workflow run could not be found.");
      }
      preparingRuns.get(runId)?.abort();
      const cancelled = await updateRun(run, {
        status: "cancelled",
        stopReason: LOOP_USER_STOP_REASONS.cancelled,
        activeRoleId: null,
        activeToken: null,
        completedAt: deps.nowIso(),
        events: [...run.events, event(deps, "cancelled", "Workflow cancelled.", null, run.iterations.at(-1)?.number ?? null)]
      });
      activeTurns.get(runId)?.abort();
      return cancelled;
    },
    dispose() {
      disposed = true;
      for (const turn of activeTurns.values()) {
        turn.abort();
      }
      activeTurns.clear();
      for (const preparation of preparingRuns.values()) preparation.abort();
      preparingRuns.clear();
      rescheduleRuns.clear();
      stageReports.clear();
    }
  };
}
