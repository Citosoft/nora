import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { BotConversationHost } from "@main/types/bots/conversations.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { Routine, RoutineCalendar, RoutineCalendarRange, RoutineInput, RoutineList, RoutineRun } from "@shared/types/bots/routines.types";
import type { BotRoutineReply, RoutineCalendarReply } from "@shared/ipc/types/botRoutineGateway.types";

/** Durable routines and their run history, in `bot-routines.sqlite`. The store holds rows; the scheduler owns every rule. */
export interface RoutineStore {
  list(botId: string): Routine[];
  /** Every routine of every bot, for the scheduler. */
  all(): Routine[];
  get(id: string): Routine | null;
  put(routine: Routine): void;
  /** Writes a batch atomically, leaving no partial set after a validation or storage failure. */
  putMany(routines: readonly Routine[]): void;
  /** Removes the routine and its runs. */
  remove(id: string): void;
  count(botId: string): number;
  /** The bot's newest runs across its routines. */
  runs(botId: string, limit: number): RoutineRun[];
  getRun(id: string): RoutineRun | null;
  /** Every stored run; history is capped per routine, so this stays small. */
  allRuns(): RoutineRun[];
  putRun(run: RoutineRun): void;
  /** Runs of the routine that have not finished. */
  unfinishedRuns(routineId: string): RoutineRun[];
  /** Runs left queued or running by a previous app session. */
  allUnfinishedRuns(): RoutineRun[];
  close(): void;
}

/** The thread a run is sent to; `workspaceId` pins a chat run to the routine's workspace (a routine's own thread already lives there). */
export interface RoutineTarget { conversationId: string; workspaceId: string | null; }
/** A workspace a routine can run in. */
export interface RoutineWorkspace { id: string; name: string; workspace: WorkspaceRef; }

export interface RoutineSchedulerDeps {
  store: RoutineStore;
  host: BotConversationHost;
  /** The bot as it resolves in a workspace, or null when it is not available there. */
  bot(workspaceId: string, botId: string): BotDefinition | null;
  workspaces(): readonly RoutineWorkspace[];
  nextId(): string;
  clock?: () => number;
  /** Arms a timer; returns its cancel function. Injectable so tests drive time. */
  schedule?: (callback: () => void, delayMs: number) => () => void;
  /** Called with a bot's id whenever its routines or runs change. */
  onChanged(botId: string): void;
  onError(error: unknown): void;
  /** How long a run may take before it is interrupted; long so routines that wait for the user still finish. */
  runTimeoutMs?: number;
}

export interface RoutineScheduler {
  /** Settles runs and occurrences from while Nora was closed, then arms the timer. */
  start(): void;
  stop(): void;
  list(botId: string): RoutineList;
  /** Every bot's routines and their runs in the range, for the calendar. */
  calendar(range: RoutineCalendarRange): RoutineCalendar;
  create(input: RoutineInput): Routine;
  createMany(inputs: readonly RoutineInput[]): Routine[];
  update(id: string, input: RoutineInput): Routine;
  setActive(id: string, active: boolean): Routine;
  remove(id: string): void;
  runNow(id: string): RoutineRun;
  /** Starts every occurrence that is due now; the timer calls it, and tests call it directly. */
  processDue(): void;
  /** Resolves once every run started so far has settled; for tests and shutdown. */
  idle(): Promise<void>;
}

export interface BotRoutineIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<BotRoutineReply | RoutineCalendarReply>): void;
    removeHandler(channel: string): void;
  };
  routines: RoutineScheduler;
  isAllowedSender(event: ConversationInvocation): boolean;
}
