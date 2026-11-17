import { useCallback, useEffect, useState } from "react";
import { botRoutineClient } from "@/components/app/clients/botRoutineClient";
import type { BotRoutineRequest } from "@shared/ipc/types/botRoutineGateway.types";
import type { RoutineCalendar } from "@shared/types/bots/routines.types";
import type { RoutineCalendarSpan, RoutineCalendarState } from "@/components/app/types/routineCalendar.types";

const message = (cause: unknown, fallback: string): string => cause instanceof Error ? cause.message : fallback;

/** Every bot's routines and runs in the visible range; it reloads when the range moves and whenever any routine or run changes. */
export function useRoutineCalendar(span: Pick<RoutineCalendarSpan, "from" | "to">): RoutineCalendarState {
  const { from, to } = span;
  const [calendar, setCalendar] = useState<RoutineCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    const load = (): void => {
      void botRoutineClient.calendar({ from, to })
        .then((next) => { if (current) { setCalendar(next); setError(null); } })
        .catch((cause: unknown) => { if (current) setError(message(cause, "The routine calendar could not be loaded.")); })
        .finally(() => { if (current) setLoading(false); });
    };
    setLoading(true); load();
    const unsubscribe = botRoutineClient.onChanged(load);
    return () => { current = false; unsubscribe(); };
  }, [from, to]);
  // Changes come back through `onChanged`, which reloads the range.
  const act = useCallback(async (request: BotRoutineRequest): Promise<void> => {
    setBusy(true); setError(null);
    try { await botRoutineClient.request(request); }
    catch (cause) { setError(message(cause, "The routine could not be updated.")); }
    finally { setBusy(false); }
  }, []);
  return { calendar, loading, error, busy,
    runNow: (routine) => act({ kind: "run-now", botId: routine.botId, id: routine.id }),
    setActive: (routine, active) => act({ kind: "set-active", botId: routine.botId, id: routine.id, active }) };
}
