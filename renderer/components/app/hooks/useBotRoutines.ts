import { useCallback, useEffect, useState } from "react";
import { botRoutineClient } from "@/components/app/clients/botRoutineClient";
import type { BotRoutineRequest } from "@shared/ipc/types/botRoutineGateway.types";
import type { Routine, RoutineRun } from "@shared/types/bots/routines.types";
import type { BotRoutinesState } from "@/components/app/types/botRoutines.types";

/** A bot's routines and recent runs as stored in main; it reloads whenever main reports a change, including scheduled runs. */
export function useBotRoutines(botId: string): BotRoutinesState {
  const [routines, setRoutines] = useState<readonly Routine[]>([]);
  const [runs, setRuns] = useState<readonly RoutineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (request: BotRoutineRequest): Promise<void> => {
    const list = await botRoutineClient.request(request);
    setRoutines(list.routines); setRuns(list.runs);
  }, []);
  const run = useCallback(async (request: BotRoutineRequest): Promise<boolean> => {
    setBusy(true); setError(null);
    try { await load(request); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The routine could not be updated."); return false; }
    finally { setBusy(false); }
  }, [load]);
  useEffect(() => {
    let current = true;
    const refresh = (): void => {
      void load({ kind: "list", botId }).catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : "Routines could not be loaded."); })
        .finally(() => { if (current) setLoading(false); });
    };
    setLoading(true); refresh();
    const unsubscribe = botRoutineClient.onChanged((change) => { if (change.botId === botId) refresh(); });
    return () => { current = false; unsubscribe(); };
  }, [load, botId]);
  return { routines, runs, loading, busy, error,
    create: (routine) => run({ kind: "create", routine }),
    update: (id, routine) => run({ kind: "update", botId, id, routine }),
    setActive: (id, active) => run({ kind: "set-active", botId, id, active }),
    remove: (id) => run({ kind: "remove", botId, id }),
    runNow: (id) => run({ kind: "run-now", botId, id }) };
}
