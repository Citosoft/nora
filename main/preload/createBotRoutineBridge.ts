import { botRoutineReplySchema, botRoutinesChangedChannel, botRoutinesChannel, routineCalendarChannel, routineCalendarReplySchema } from "@shared/bots/routines/gateway";
import type { BotRoutineBridge, BotRoutinesChanged } from "@shared/ipc/types/botRoutineGateway.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createBotRoutineBridge(): BotRoutineBridge {
  return {
    async request(input) {
      const reply = botRoutineReplySchema.safeParse(await invokeIpc(botRoutinesChannel, input));
      if (!reply.success) throw new Error("Nora returned an incompatible response for bot routines");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.list;
    },
    async calendar(range) {
      const reply = routineCalendarReplySchema.safeParse(await invokeIpc(routineCalendarChannel, range));
      if (!reply.success) throw new Error("Nora returned an incompatible response for the routine calendar");
      if (!reply.data.ok) throw new Error(reply.data.message);
      return reply.data.calendar;
    },
    onChanged: (listener) => subscribeToIpcEvent<BotRoutinesChanged>(botRoutinesChangedChannel, listener)
  };
}
