import { useCallback, useEffect, useState } from "react";
import { botMemoryClient } from "@/components/app/clients/botMemoryClient";
import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { BotMemoryRequest } from "@shared/ipc/types/botMemoryGateway.types";
import type { BotMemoryState } from "@/components/app/types/botMemory.types";

/** A bot's notes as stored in main; every change replies with the full list, so the view never drifts from storage. */
export function useBotMemory(botId: string): BotMemoryState {
  const [notes, setNotes] = useState<readonly BotMemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (request: BotMemoryRequest): Promise<boolean> => {
    setBusy(true); setError(null);
    try { setNotes(await botMemoryClient.request(request)); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Notes could not be updated."); return false; }
    finally { setBusy(false); setLoading(false); }
  }, []);
  useEffect(() => { setLoading(true); void run({ kind: "list", botId }); }, [run, botId]);
  return { notes, loading, busy, error,
    add: (text, workspaceId) => run({ kind: "add", botId, workspaceId, text }),
    update: (id, text) => run({ kind: "update", botId, id, text }),
    remove: (id) => run({ kind: "remove", botId, id }) };
}
