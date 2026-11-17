import type { BotRoutineBridge } from "@shared/ipc/types/botRoutineGateway.types";

export const botRoutineClient: BotRoutineBridge = {
  request: (input) => window.nora.botRoutines.request(input),
  calendar: (range) => window.nora.botRoutines.calendar(range),
  onChanged: (listener) => window.nora.botRoutines.onChanged(listener)
};
