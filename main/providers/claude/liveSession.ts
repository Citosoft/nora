import type { SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeLiveSessionDeps, ClaudeMessageStream, ClaudeSession, ClaudeTurn, ClaudeTurnInput } from "@main/types/execution/claude.types";

/** After background work ends, Claude starts its report turn promptly; this is how long an idle session waits for it. */
const FOLLOW_UP_GRACE_MS = 15_000;
const SUMMARY_MAX_LENGTH = 200;

/** One turn's raw messages, in order. Ending it lets the reader finish; failing it makes the reader throw. */
class TurnChannel implements ClaudeMessageStream {
  private readonly queue: SDKMessage[] = [];
  private wake: (() => void) | null = null;
  private ended = false;
  private failure: { error: unknown } | null = null;

  push(message: SDKMessage): void {
    if (this.ended) return;
    this.queue.push(message);
    this.signal();
  }
  end(): void { this.ended = true; this.signal(); }
  fail(error: unknown): void { if (!this.ended) this.failure = { error }; this.end(); }
  close(): void { this.end(); }

  async *[Symbol.asyncIterator](): AsyncGenerator<SDKMessage> {
    for (;;) {
      const next = this.queue.shift();
      if (next) { yield next; continue; }
      if (this.failure) throw this.failure.error;
      if (this.ended) return;
      await new Promise<void>((resolve) => { this.wake = resolve; });
    }
  }

  private signal(): void { const wake = this.wake; this.wake = null; wake?.(); }
}

/** Messages that mean Claude is producing a turn, as opposed to status, task bookkeeping or a late suggestion. */
function startsTurn(message: SDKMessage): boolean {
  return message.type === "assistant" || message.type === "stream_event" || message.type === "user";
}

function userMessage(sessionId: string, input: ClaudeTurnInput): SDKUserMessage {
  return { type: "user", uuid: input.nativeTurnId, session_id: sessionId, message: { role: "user", content: input.instruction }, parent_tool_use_id: null };
}

/** What woke Claude, for the follow-up run's opening milestone. */
export function describeFinishedWork(finished: readonly { name: string; status: "completed" | "failed" | "stopped" }[]): string {
  if (!finished.length) return "Claude continued after background work changed";
  const failed = finished.some((task) => task.status !== "completed");
  const label = `Background ${finished.length === 1 ? "task" : "tasks"} ${failed ? "ended" : "finished"}`;
  const text = `${label}: ${finished.map((task) => task.name).join(", ")}`;
  return text.length <= SUMMARY_MAX_LENGTH ? text : `${text.slice(0, SUMMARY_MAX_LENGTH - 1).trimEnd()}…`;
}

/**
 * Drives one Claude Code process across turns. Its output is a single stream; each turn ends with a `result`. Turns the
 * host sends are routed to the turn that sent them; a turn Claude starts by itself (it reports background work that
 * finished) is handed to `onFollowUp`. The process stays open while background work runs, and closes once it is idle
 * without any, so ordinary threads end their process shortly after each turn as before.
 */
export function createClaudeLiveSession(deps: ClaudeLiveSessionDeps): ClaudeSession {
  const idleCloseMs = deps.idleCloseMs ?? 5000;
  let current: TurnChannel | null = null;
  /** The last finished turn, still open for its prompt suggestion until the next turn starts. */
  let previous: TurnChannel | null = null;
  /** Session messages (such as init) that arrive before a turn Claude starts by itself. */
  let preamble: SDKMessage[] = [];
  const backgroundTasks = new Set<string>();
  const taskNames = new Map<string, string>();
  let finishedWork: { name: string; status: "completed" | "failed" | "stopped" }[] = [];
  let pendingSends = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let idleWaiters: (() => void)[] = [];
  let closing: Promise<void> | null = null;
  let model = deps.opening.model;
  let permissionMode = deps.opening.permissionMode;

  const turnOf = (channel: TurnChannel): ClaudeTurn => {
    const frames = deps.readTurn(channel);
    return { close: () => channel.end(), [Symbol.asyncIterator]: () => frames[Symbol.asyncIterator]() };
  };
  const cancelIdle = (): void => { clearTimeout(idleTimer); idleTimer = undefined; };
  const armIdle = (delayMs: number): void => {
    cancelIdle();
    if (closing || current || pendingSends || backgroundTasks.size) return;
    idleTimer = setTimeout(() => { void session.close(); }, delayMs);
    idleTimer.unref?.();
  };
  const notifyIdle = (): void => { const waiters = idleWaiters; idleWaiters = []; for (const resolve of waiters) resolve(); };
  const whenIdle = (): Promise<void> => (current === null || closing ? Promise.resolve() : new Promise((resolve) => { idleWaiters.push(resolve); }));

  const begin = (channel: TurnChannel): void => {
    cancelIdle();
    previous?.end(); previous = null;
    current = channel;
    for (const message of preamble) channel.push(message);
    preamble = [];
    finishedWork = [];
  };

  const trackBackground = (message: SDKMessage): void => {
    if (message.type !== "system") return;
    switch (message.subtype) {
      case "task_started": taskNames.set(message.task_id, message.description); break;
      case "background_tasks_changed": {
        const wasBusy = backgroundTasks.size > 0;
        backgroundTasks.clear();
        for (const task of message.tasks) {
          if (task.ambient) continue;
          backgroundTasks.add(task.task_id);
          taskNames.set(task.task_id, task.description);
        }
        if (backgroundTasks.size) cancelIdle();
        else if (wasBusy && !current) armIdle(Math.max(idleCloseMs, FOLLOW_UP_GRACE_MS));
        break;
      }
      case "task_notification":
        // A task that ends mid-turn is folded into that turn; only ones that end while idle explain a follow-up.
        if (!current) finishedWork.push({ name: taskNames.get(message.task_id) ?? message.summary, status: message.status });
        break;
    }
  };

  const route = (message: SDKMessage): void => {
    trackBackground(message);
    if (current) {
      current.push(message);
      if (message.type === "result") {
        previous = current; current = null;
        notifyIdle();
        armIdle(idleCloseMs);
      }
      return;
    }
    if (message.type === "prompt_suggestion") { previous?.push(message); return; }
    if (startsTurn(message)) {
      const channel = new TurnChannel();
      const summary = describeFinishedWork(finishedWork);
      begin(channel);
      channel.push(message);
      deps.onFollowUp(turnOf(channel), summary);
      return;
    }
    if (message.type === "system" && message.subtype === "init") preamble.push(message);
  };

  /** Ends every open turn when the process stops; a turn cut off mid-way fails with the reason when there is one. */
  const endTurns = (failure?: { error: unknown }): void => {
    const cut: TurnChannel | null = current;
    if (failure) cut?.fail(failure.error); else cut?.end();
    current = null;
    const done: TurnChannel | null = previous;
    done?.end(); previous = null;
  };

  const openingChannel = new TurnChannel();
  const session: ClaudeSession = {
    opening: turnOf(openingChannel),
    send(input) {
      pendingSends += 1;
      cancelIdle();
      const channel = new TurnChannel();
      void (async () => {
        try {
          await whenIdle();
          if (closing) throw new Error("Claude Code closed before this message could be sent");
          begin(channel);
          if (input.model !== model) { await deps.native.setModel(input.model); model = input.model; }
          if (input.permissionMode !== permissionMode) { await deps.native.setPermissionMode(input.permissionMode); permissionMode = input.permissionMode; }
          deps.input.push(userMessage(deps.sessionId, input));
        } catch (error) {
          if (current === channel) current = null;
          channel.fail(error);
        } finally {
          pendingSends -= 1;
        }
      })();
      return turnOf(channel);
    },
    async interrupt() { await deps.native.interrupt(); },
    close() {
      closing ??= (async () => {
        cancelIdle();
        deps.input.end();
        deps.native.close();
        current?.end(); previous?.end();
        notifyIdle();
      })();
      return closing;
    },
    isLive: () => closing === null,
    hasBackgroundWork: () => backgroundTasks.size > 0
  };

  // The opening turn is the session's first: route its output there and send its instruction straight away.
  begin(openingChannel);
  void (async () => {
    try {
      for await (const message of deps.native) route(message);
      endTurns();
    } catch (error) {
      endTurns({ error });
    } finally {
      void session.close();
      notifyIdle();
    }
  })();
  deps.input.push(userMessage(deps.sessionId, deps.opening));
  return session;
}
