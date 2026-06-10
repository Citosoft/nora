import type {
  LoopDefinition,
  LoopIteration,
  LoopOutputEvent,
  LoopOutputEventPayload,
  LoopRoleResult,
  LoopRun,
  LoopRunEvent,
  LoopRunRole,
  SaveLoopDefinitionPayload,
  StartLoopRunPayload
} from "@shared/appTypes";
import { buildLoopHeadlessShellCommand, assertLoopHeadlessToolSupported } from "@shared/loopHeadlessLaunch";
import { normalizeLoopRunGoal, resolveLoopRunGoalAttachmentPath, type LoopRunGoal } from "@shared/loopRunGoal";
import { resolveLoopRunLimits } from "@shared/loopLimits";
import { isLoopRunDeletable } from "@shared/loopRunLifecycle";
import type { LoopRunner, LoopRunnerDeps, ParsedLoopResult } from "@main/types/loopRunner.types";
import type { PrepareLoopRunWorktreeInput } from "@main/types/prepareLoopRunWorktree.types";
import { normalizeLoopDefinition } from "./loopValidation";
import { buildReviewerPrompt, buildWriterPrompt, parseLoopResult } from "./loopProtocol";
import { createLoopOutputNormalizer } from "./output/createLoopOutputNormalizer";

const MAX_OUTPUT_LOG_CHARS = 500_000;
const MAX_OUTPUT_EVENTS = 2_000;

function runGoal(run: LoopRun): LoopRunGoal {
  return {
    objective: run.objective,
    specPath: run.specPath,
    taskPath: run.taskPath
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
  const activeTurns = new Map<string, { abort: () => void }>();
  const pendingRunWrites = new Map<string, Promise<void>>();
  let disposed = false;

  function queueRunWrite(run: LoopRun, outputOnly: boolean): Promise<void> {
    const snapshot = structuredClone(run);
    const previous = pendingRunWrites.get(run.id) ?? Promise.resolve();
    const pending = previous.then(async () => {
      if (outputOnly) {
        const latest = await deps.store.getRun(snapshot.projectId, snapshot.id);
        if (!latest) {
          return;
        }
        await deps.store.saveRun({
          ...latest,
          outputLog: snapshot.outputLog,
          outputEvents: snapshot.outputEvents
        });
        return;
      }
      await deps.store.saveRun(snapshot);
    });
    pendingRunWrites.set(run.id, pending);
    void pending.catch(() => undefined);
    return pending;
  }

  async function flushRunWrites(runId: string): Promise<void> {
    await pendingRunWrites.get(runId);
  }

  async function persist(run: LoopRun): Promise<LoopRun> {
    const bounded = { ...run, events: run.events.slice(-500) };
    await queueRunWrite(bounded, false);
    deps.notifyRunChanged(bounded);
    return bounded;
  }

  async function updateRun(run: LoopRun, partial: Partial<LoopRun>): Promise<LoopRun> {
    await flushRunWrites(run.id);
    const latest = await deps.store.getRun(run.projectId, run.id);
    const base = latest ?? run;
    const controlStatus = base.status === "cancelled" || base.status === "paused" || base.status === "pausing"
      ? base.status
      : undefined;
    return persist({
      ...base,
      ...partial,
      ...(partial.status === undefined && controlStatus ? { status: controlStatus } : {}),
      updatedAt: deps.nowIso()
    });
  }

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
    if (!wasActive || activeRuns.has(run.id)) {
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

  async function runHeadlessTurn(run: LoopRun, role: LoopRunRole, prompt: string, token: string): Promise<ParsedLoopResult> {
    if (!run.worktreePath) {
      throw new Error("Workflow worktree path is missing.");
    }

    assertLoopHeadlessToolSupported(role.toolId, role.name);
    const tool = deps.resolveLoopTool(role.toolId);
    const resolvedPrompt = await appendGoalContext(run, prompt.replaceAll("__NORA_LOOP_TOKEN__", token));
    const command = buildLoopHeadlessShellCommand({
      toolId: role.toolId,
      roleKind: role.kind,
      detectedCommand: tool.detectedCommand,
      prompt: resolvedPrompt,
      workspacePath: run.worktreePath
    });
    const iteration = run.iterations.at(-1)?.number ?? 1;
    const turnId = deps.randomId();
    const normalizer = createLoopOutputNormalizer({
      turnId,
      roleId: role.roleId,
      roleName: role.name,
      roleKind: role.kind,
      toolId: role.toolId,
      iteration,
      token,
      nowIso: deps.nowIso,
      randomId: deps.randomId
    });
    let liveRun = emitOutput(run, "", [outputEvent(role, turnId, iteration, {
      kind: "turn",
      phase: "started",
      exitCode: null,
      aborted: false
    })]);
    run.outputLog = liveRun.outputLog;
    run.outputEvents = liveRun.outputEvents;
    await persist(liveRun);

    const execution = deps.headlessExecutor.execute({
      command,
      cwd: run.worktreePath,
      env: tool.env,
      timeoutMs: run.limits.roleTimeoutMs,
      onOutput: (chunk) => {
        liveRun = emitOutput(liveRun, chunk, normalizer.push(chunk));
        run.outputLog = liveRun.outputLog;
        run.outputEvents = liveRun.outputEvents;
        void queueRunWrite(liveRun, true);
      }
    });
    activeTurns.set(run.id, { abort: execution.abort });

    try {
      const controlRun = await deps.store.getRun(run.projectId, run.id);
      if (controlRun?.status === "pausing" || controlRun?.status === "cancelled") {
        execution.abort();
      }
      const result = await execution.result;
      const normalizedEvents = normalizer.finish(result.output);
      const turnFinished = outputEvent(role, turnId, iteration, {
        kind: "turn",
        phase: "finished",
        exitCode: result.exitCode,
        aborted: result.aborted
      });
      const diagnostic = result.aborted
        ? `\n[${role.name} stopped]\n`
        : `\n[${role.name} exited with code ${result.exitCode ?? "unknown"}]\n`;
      liveRun = emitOutput(liveRun, diagnostic, [...normalizedEvents, turnFinished]);
      run.outputLog = liveRun.outputLog;
      run.outputEvents = liveRun.outputEvents;
      liveRun = await updateRun(liveRun, {
        outputLog: liveRun.outputLog,
        outputEvents: liveRun.outputEvents
      });

      if (result.aborted) {
        throw new Error("Workflow agent turn was interrupted.");
      }

      const parsed = parseLoopResult(normalizer.getProtocolText() || result.output, token);
      if (!parsed) {
        throw new Error(`${role.name} finished without a valid workflow result marker.`);
      }
      return parsed;
    } finally {
      activeTurns.delete(run.id);
    }
  }

  async function waitForResult(run: LoopRun, role: LoopRunRole, prompt: string): Promise<ParsedLoopResult> {
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

    const parsed = await runHeadlessTurn(liveRun, role, prompt, token);
    return parsed;
  }

  function buildRoles(definition: LoopDefinition): LoopRunRole[] {
    return [
      {
        roleId: definition.writer.id,
        kind: definition.writer.kind,
        name: definition.writer.name,
        toolId: definition.writer.toolId,
        instructions: definition.writer.instructions
      },
      ...definition.reviewers.map((reviewer) => ({
        roleId: reviewer.id,
        kind: reviewer.kind,
        name: reviewer.name,
        toolId: reviewer.toolId,
        instructions: reviewer.instructions
      }))
    ];
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
        if (run.iterations.length >= run.limits.maxIterations) {
          run = await pauseWithError(run, "The workflow reached its iteration limit.");
          break;
        }

        const iteration: LoopIteration = {
          number: run.iterations.length + 1,
          startedAt: deps.nowIso(),
          completedAt: null,
          writerResult: null,
          reviewerResults: []
        };
        run = await updateRun(run, { iterations: [...run.iterations, iteration] });

        const writer = run.roles.find((role) => role.kind === "writer");
        if (!writer) {
          throw new Error("Workflow writer is missing.");
        }

        const previous = run.iterations.length > 1 ? run.iterations.at(-2) : undefined;
        const writerParsed = await waitForResult(
          run,
          writer,
          buildWriterPrompt(run.definition, writer, runGoal(run), previous, "__NORA_LOOP_TOKEN__")
        );
        const writerResult: LoopRoleResult = {
          roleId: writer.roleId,
          outcome: writerParsed.outcome,
          summary: writerParsed.summary,
          completedAt: deps.nowIso()
        };
        iteration.writerResult = writerResult;
        run = await updateRun(run, {
          activeRoleId: null,
          activeToken: null,
          iterations: [...run.iterations.slice(0, -1), iteration],
          events: [...run.events, event(deps, "role_finished", `${writer.name}: ${writerParsed.outcome}.`, writer.roleId, iteration.number)]
        });

        if (run.status !== "running") {
          if (run.status === "pausing") {
            run = await updateRun(run, {
              status: "paused",
              stopReason: "Paused by user.",
              events: [...run.events, event(deps, "paused", "Workflow paused.", null, iteration.number)]
            });
          }
          break;
        }

        for (const reviewer of run.roles.filter((role) => role.kind === "reviewer")) {
          const parsed = await waitForResult(
            run,
            reviewer,
            buildReviewerPrompt(run.definition, reviewer, runGoal(run), writerParsed.summary, "__NORA_LOOP_TOKEN__")
          );
          iteration.reviewerResults.push({
            roleId: reviewer.roleId,
            outcome: parsed.outcome,
            summary: parsed.summary,
            completedAt: deps.nowIso()
          });
          run = await updateRun(run, {
            activeRoleId: null,
            activeToken: null,
            iterations: [...run.iterations.slice(0, -1), iteration],
            events: [...run.events, event(deps, "role_finished", `${reviewer.name}: ${parsed.outcome}.`, reviewer.roleId, iteration.number)]
          });
          if (run.status !== "running") {
            break;
          }
        }

        iteration.completedAt = deps.nowIso();
        const approved = iteration.reviewerResults.every((result) => result.outcome === "approve");
        if (writerParsed.outcome === "complete" && approved) {
          run = await updateRun(run, {
            status: "completed",
            stopReason: "Writer completed and all reviewers approved.",
            completedAt: deps.nowIso(),
            iterations: [...run.iterations.slice(0, -1), iteration],
            events: [...run.events, event(deps, "completed", "Workflow completed.", null, iteration.number)]
          });
          break;
        }

        if (run.status === "pausing") {
          run = await updateRun(run, {
            status: "paused",
            stopReason: "Paused by user.",
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
          stopReason: "Paused by user.",
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
      } else if (latest && latest.status !== "cancelled" && latest.status !== "completed") {
        await pauseWithError(latest, error instanceof Error ? error.message : String(error));
      }
    } finally {
      activeRuns.delete(runId);
    }
  }

  function schedule(run: LoopRun): void {
    if (activeRuns.has(run.id)) {
      return;
    }
    activeRuns.set(run.id, execute(run.id, run.projectId));
  }

  return {
    listDefinitions: (projectId) => deps.store.listDefinitions(projectId),
    async saveDefinition(payload: SaveLoopDefinitionPayload) {
      const definition = normalizeLoopDefinition(payload, deps.nowIso());
      await deps.store.saveDefinition(definition);
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
    },
    async startRun(payload: StartLoopRunPayload) {
      const definition = (await deps.store.listDefinitions(payload.projectId)).find((item) => item.id === payload.definitionId);
      if (!definition) {
        throw new Error("Workflow could not be found.");
      }

      for (const role of [definition.writer, ...definition.reviewers]) {
        assertLoopHeadlessToolSupported(role.toolId, role.name);
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
        limits,
        status: "preparing",
        stopReason: null,
        sessionId: null,
        worktreeId: null,
        worktreePath: null,
        outputLog: "",
        outputEvents: [],
        roles: buildRoles(definition),
        iterations: [],
        events: [event(deps, "created", "Workflow run created.", null, null)],
        activeRoleId: null,
        activeToken: null,
        createdAt: deps.nowIso(),
        startedAt: null,
        updatedAt: deps.nowIso(),
        completedAt: null
      };
      await persist(run);

      try {
        const prepInput: PrepareLoopRunWorktreeInput = {
          payload: withUniqueRunBranch(payload, run.id),
          writerToolId: definition.writer.toolId,
          writerName: definition.writer.name,
          onProgress: async (message) => {
            const writer = run.roles.find((role) => role.kind === "writer") ?? run.roles[0];
            const progressEvents = writer ? [outputEvent(writer, `prepare-${run.id}`, 0, {
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
          status: "running",
          startedAt: deps.nowIso(),
          stopReason: null,
          events: [...run.events, event(deps, "resumed", "Workflow execution started in headless mode.", null, null)]
        });
        schedule(run);
        return run;
      } catch (error) {
        return pauseWithError(run, error instanceof Error ? error.message : String(error));
      }
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
          stopReason: "Paused by user.",
          events: [...run.events, event(
            deps,
            "paused",
            "Workflow paused.",
            null,
            run.iterations.at(-1)?.number ?? null
          )]
        });
      }
      const pausing = await updateRun(run, { status: "pausing", stopReason: "Pause requested by user." });
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
      const resumed = await updateRun(run, {
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
      activeTurns.get(runId)?.abort();
      activeTurns.delete(runId);
      return updateRun(run, {
        status: "cancelled",
        stopReason: "Cancelled by user.",
        activeRoleId: null,
        activeToken: null,
        completedAt: deps.nowIso(),
        events: [...run.events, event(deps, "cancelled", "Workflow cancelled.", null, run.iterations.at(-1)?.number ?? null)]
      });
    },
    async getActiveRunForAgent(_agentId) {
      return null;
    },
    dispose() {
      disposed = true;
      for (const turn of activeTurns.values()) {
        turn.abort();
      }
      activeTurns.clear();
      pendingRunWrites.clear();
    }
  };
}
