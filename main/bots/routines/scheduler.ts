import { ROUTINES_PER_BOT_MAX } from "@shared/bots/routines/contracts";
import { missedOccurrences, nextRoutineOccurrence, RoutineScheduleError, validateRoutineSchedule } from "@shared/bots/routines/schedule";
import { askBotThread } from "@main/bots/conversations/runner";
import { buildRoutineCalendar } from "@shared/bots/routines/calendar";
import { routineTarget } from "./dispatch";
import { routinePrompt } from "./prompt";
import type { Routine, RoutineInput, RoutineRun, RoutineRunStatus } from "@shared/types/bots/routines.types";
import type { RoutineScheduler, RoutineSchedulerDeps } from "@main/types/bots/routines.types";

const RUN_TIMEOUT_MS = 12 * 60 * 60_000;
/** setTimeout cannot wait longer than ~24.8 days; long waits re-arm in steps instead. */
const MAX_TIMER_MS = 6 * 60 * 60_000;
const RECENT_RUNS = 30;
const STATUS_BY_REPLY = { completed: "succeeded", failed: "failed", interrupted: "interrupted", "timed-out": "failed" } as const;

/**
 * Owns every bot's routines: one timer armed for the earliest due routine across all bots, so adding, editing, pausing or
 * deleting a routine only ever re-derives that one time. Runs go through the ordinary thread engine; this module only decides
 * when to start them and records how they ended.
 */
export function createRoutineScheduler(deps: RoutineSchedulerDeps): RoutineScheduler {
  const clock = deps.clock ?? Date.now;
  const schedule = deps.schedule ?? ((callback, delayMs) => { const timer = setTimeout(callback, delayMs); timer.unref?.(); return () => clearTimeout(timer); });
  const active = new Map<string, AbortController>();
  const pending = new Set<Promise<void>>();
  let cancelTimer: (() => void) | null = null;
  let running = false;
  const nowIso = (): string => new Date(clock()).toISOString();

  const required = (id: string): Routine => {
    const routine = deps.store.get(id);
    if (!routine) throw new Error("This routine no longer exists.");
    return routine;
  };
  const nextRunAt = (routine: Pick<Routine, "active" | "schedule" | "timezone">): string | null => {
    if (!routine.active) return null;
    return nextRoutineOccurrence(routine.schedule, routine.timezone, new Date(clock()))?.toISOString() ?? null;
  };
  const save = (routine: Routine): Routine => { deps.store.put(routine); deps.onChanged(routine.botId); return routine; };
  const saveRun = (run: RoutineRun): RoutineRun => { deps.store.putRun(run); deps.onChanged(run.botId); return run; };
  const updateRun = (id: string, patch: Partial<Pick<RoutineRun, "status" | "error" | "conversationId">>): void => {
    const run = deps.store.getRun(id);
    if (run) saveRun({ ...run, ...patch, updatedAt: nowIso() });
  };
  const newRun = (routine: Routine, kind: RoutineRun["kind"], scheduledFor: string, status: RoutineRunStatus,
    extra: Partial<Pick<RoutineRun, "error" | "missed">> = {}): RoutineRun => {
    const at = nowIso();
    return saveRun({ id: deps.nextId(), routineId: routine.id, botId: routine.botId, kind, scheduledFor, routineName: routine.name, status,
      error: extra.error ?? null, missed: extra.missed ?? null, conversationId: null, createdAt: at, updatedAt: at });
  };

  /** Checks an editor or tool input against the bot, workspace and schedule rules before anything is stored. */
  const validate = (input: RoutineInput): void => {
    const workspace = deps.workspaces().find((entry) => entry.id === input.workspaceId);
    if (!workspace) throw new Error("Choose a workspace that is open in Nora.");
    const bot = deps.bot(input.workspaceId, input.botId);
    if (!bot) throw new Error(`This bot is not available in ${workspace.name}.`);
    validateRoutineSchedule(input.schedule, input.timezone);
    if (input.active && input.schedule.kind === "once" && !nextRunAt(input)) throw new RoutineScheduleError("Choose a date and time in the future.");
  };

  async function execute(routine: Routine, run: RoutineRun, controller: AbortController): Promise<void> {
    const workspace = deps.workspaces().find((entry) => entry.id === routine.workspaceId);
    const bot = workspace ? deps.bot(workspace.id, routine.botId) : null;
    if (!workspace || !bot) {
      updateRun(run.id, { status: "failed", error: workspace ? "The bot is no longer available in this routine's workspace." : "The routine's workspace is not open in Nora." });
      return;
    }
    const runner = { host: deps.host, nextId: deps.nextId };
    const { conversationId, workspaceId } = await routineTarget(runner, routine, bot, workspace);
    const current = deps.store.get(routine.id);
    if (current && routine.runIn === "thread" && current.threadId !== conversationId) save({ ...current, threadId: conversationId });
    updateRun(run.id, { status: "running", conversationId });
    const reply = await askBotThread(runner, { conversationId, instruction: routinePrompt(routine, run), signal: controller.signal,
      ...(workspaceId ? { workspaceId } : {}),
      timeoutMs: deps.runTimeoutMs ?? RUN_TIMEOUT_MS, onWaiting: () => updateRun(run.id, { status: "needs-attention" }) });
    updateRun(run.id, { status: STATUS_BY_REPLY[reply.status],
      error: reply.status === "timed-out" ? "The run took too long and was stopped." : reply.failure?.slice(0, 500) ?? null });
  }

  function dispatch(routine: Routine, run: RoutineRun): void {
    const controller = new AbortController();
    active.set(run.id, controller);
    const work = execute(routine, run, controller)
      .catch((error: unknown) => {
        updateRun(run.id, { status: "failed", error: (error instanceof Error ? error.message : "The run could not start.").slice(0, 500) });
        deps.onError(error);
      })
      .finally(() => { active.delete(run.id); pending.delete(work); });
    pending.add(work);
  }

  function arm(): void {
    cancelTimer?.(); cancelTimer = null;
    if (!running) return;
    const due = deps.store.all().flatMap((routine) => routine.active && routine.nextRunAt ? [Date.parse(routine.nextRunAt)] : []);
    if (!due.length) return;
    const delay = Math.min(Math.max(0, Math.min(...due) - clock()), MAX_TIMER_MS);
    cancelTimer = schedule(() => { cancelTimer = null; try { processDue(); } catch (error) { deps.onError(error); arm(); } }, delay);
  }

  /** Occurrences from while Nora was closed are summarised on one cancelled run; `run-once` keeps the newest due so it runs now. */
  function settleMissed(): void {
    const now = new Date(clock());
    for (const routine of deps.store.all()) {
      if (!routine.active || !routine.nextRunAt || Date.parse(routine.nextRunAt) > now.getTime()) continue;
      if (routine.schedule.kind === "once") {
        if (routine.missedPolicy === "skip") {
          newRun(routine, "scheduled", routine.nextRunAt, "cancelled", { missed: { count: 1, until: null }, error: "Nora was closed at this time." });
          save({ ...routine, active: false, nextRunAt: null, updatedAt: nowIso() });
        }
        continue;
      }
      const missed = missedOccurrences(routine.schedule, routine.timezone, new Date(routine.nextRunAt), now);
      const dropped = routine.missedPolicy === "run-once" ? missed.count - (missed.truncated ? 0 : 1) : missed.count;
      const until = routine.missedPolicy === "run-once" ? missed.previous : missed.last;
      if (dropped > 0 && until) {
        newRun(routine, "scheduled", routine.nextRunAt, "cancelled",
          { missed: { count: dropped, until: dropped > 1 ? until.toISOString() : null }, error: "Nora was closed at this time." });
      }
      save({ ...routine, nextRunAt: (routine.missedPolicy === "run-once" ? missed.last : missed.next).toISOString(), updatedAt: nowIso() });
    }
  }

  function processDue(): void {
    const now = new Date(clock());
    for (const routine of deps.store.all()) {
      if (!routine.active || !routine.nextRunAt || Date.parse(routine.nextRunAt) > now.getTime()) continue;
      if (routine.schedule.kind === "once") {
        const run = newRun(routine, "scheduled", routine.nextRunAt, "queued");
        const finished = save({ ...routine, active: false, nextRunAt: null, updatedAt: nowIso() });
        dispatch(finished, run);
        continue;
      }
      // Late wake-ups (sleep, a busy machine) collapse to the newest due occurrence instead of a burst of runs.
      const missed = missedOccurrences(routine.schedule, routine.timezone, new Date(routine.nextRunAt), now);
      const advanced = save({ ...routine, nextRunAt: missed.next.toISOString(), updatedAt: nowIso() });
      if (deps.store.unfinishedRuns(routine.id).length) {
        newRun(advanced, "scheduled", missed.last.toISOString(), "cancelled", { error: "Skipped because the previous run had not finished." });
        continue;
      }
      dispatch(advanced, newRun(advanced, "scheduled", missed.last.toISOString(), "queued"));
    }
    arm();
  }

  return {
    start() {
      running = true;
      for (const run of deps.store.allUnfinishedRuns()) updateRun(run.id, { status: "interrupted", error: "Nora closed before this run finished." });
      try { settleMissed(); } catch (error) { deps.onError(error); }
      arm();
      // Routines kept due by `run-once` start right away.
      schedule(() => { if (running) processDue(); }, 0);
    },
    stop() { running = false; cancelTimer?.(); cancelTimer = null; },
    list: (botId) => ({ routines: deps.store.list(botId), runs: deps.store.runs(botId, RECENT_RUNS) }),
    calendar(range) {
      const routines = deps.store.all().map((routine) => {
        const bot = deps.bot(routine.workspaceId, routine.botId);
        return { routine, bot: bot ? { name: bot.name, avatar: bot.avatar } : null };
      });
      return buildRoutineCalendar(range, routines, deps.store.allRuns());
    },
    create(input) {
      if (deps.store.count(input.botId) >= ROUTINES_PER_BOT_MAX) throw new Error(`A bot can have at most ${ROUTINES_PER_BOT_MAX} routines.`);
      validate(input);
      const at = nowIso();
      const routine = save({ ...input, id: deps.nextId(), nextRunAt: nextRunAt(input), threadId: null, createdAt: at, updatedAt: at });
      arm();
      return routine;
    },
    update(id, input) {
      const current = required(id);
      if (current.botId !== input.botId) throw new Error("A routine cannot move to another bot.");
      validate(input);
      // A new place or workspace starts a fresh routine thread.
      const threadId = current.runIn === input.runIn && current.workspaceId === input.workspaceId ? current.threadId : null;
      const routine = save({ ...current, ...input, threadId, nextRunAt: nextRunAt(input), updatedAt: nowIso() });
      arm();
      return routine;
    },
    setActive(id, value) {
      const current = required(id);
      if (value && current.schedule.kind === "once" && !nextRunAt({ ...current, active: true })) throw new RoutineScheduleError("Choose a date and time in the future first.");
      const routine = save({ ...current, active: value, nextRunAt: nextRunAt({ ...current, active: value }), updatedAt: nowIso() });
      arm();
      return routine;
    },
    remove(id) {
      const current = required(id);
      for (const run of deps.store.unfinishedRuns(id)) active.get(run.id)?.abort();
      deps.store.remove(id);
      deps.onChanged(current.botId);
      arm();
    },
    runNow(id) {
      const routine = required(id);
      if (deps.store.unfinishedRuns(id).length) throw new Error("This routine is already running.");
      const run = newRun(routine, "manual", nowIso(), "queued");
      dispatch(routine, run);
      return run;
    },
    processDue,
    async idle() { while (pending.size) await Promise.all([...pending]); }
  };
}
