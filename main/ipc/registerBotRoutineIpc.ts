import { botRoutineReplySchema, botRoutineRequestSchema, botRoutinesChannel, routineCalendarChannel, routineCalendarReplySchema, routineCalendarRequestSchema } from "@shared/bots/routines/gateway";
import type { RoutineList } from "@shared/types/bots/routines.types";
import type { BotRoutineRequest } from "@shared/ipc/types/botRoutineGateway.types";
import type { BotRoutineIpcDeps } from "@main/types/bots/routines.types";

function owned(deps: BotRoutineIpcDeps, botId: string, id: string): void {
  if (!deps.routines.list(botId).routines.some((routine) => routine.id === id)) throw new Error("This routine no longer exists.");
}

function apply(deps: BotRoutineIpcDeps, request: BotRoutineRequest): RoutineList {
  switch (request.kind) {
    case "list": return deps.routines.list(request.botId);
    case "create": deps.routines.create(request.routine); return deps.routines.list(request.routine.botId);
    case "update": owned(deps, request.botId, request.id); deps.routines.update(request.id, request.routine); break;
    case "set-active": owned(deps, request.botId, request.id); deps.routines.setActive(request.id, request.active); break;
    case "remove": owned(deps, request.botId, request.id); deps.routines.remove(request.id); break;
    case "run-now": owned(deps, request.botId, request.id); deps.routines.runNow(request.id); break;
  }
  return deps.routines.list(request.botId);
}

/** The window lists and edits bots' routines and reads the routine calendar here; the scheduler in main decides when they run. */
export function registerBotRoutineIpc(deps: BotRoutineIpcDeps): () => void {
  deps.ipc.handle(botRoutinesChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot access bot routines" };
    const parsed = botRoutineRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "This routine is not valid" };
    try { return botRoutineReplySchema.parse({ ok: true, list: apply(deps, parsed.data) }); }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "The routine could not be saved" }; }
  });
  deps.ipc.handle(routineCalendarChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot access bot routines" };
    const parsed = routineCalendarRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "This calendar range is not valid" };
    try { return routineCalendarReplySchema.parse({ ok: true, calendar: deps.routines.calendar(parsed.data) }); }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "The routine calendar could not be read" }; }
  });
  return () => { deps.ipc.removeHandler(botRoutinesChannel); deps.ipc.removeHandler(routineCalendarChannel); };
}
