import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommandOutcome, CommandRunner, PendingCommand } from "@/types/pendingCommand.types";
import type { RuntimeSession } from "@/types/runtimeSession.types";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import { executePendingCommand } from "@/commands/executePendingCommand";
import { useRemoteAccess } from "./useRemoteAccess";

/** Sends commands through the pending-command store so failed sends can be retried with the same IDs. */
export function useCommandRunner(session: RuntimeSession | null): CommandRunner {
  const { pendingCommands } = useRemoteAccess();
  const runtimeId = session?.runtimeId ?? null;
  const [all, setAll] = useState<readonly PendingCommand[]>(() => pendingCommands.list());
  const [inFlight, setInFlight] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setAll(pendingCommands.list());
    return pendingCommands.subscribe(setAll);
  }, [pendingCommands]);

  const run = useCallback(async (command: PendingCommand): Promise<CommandOutcome> => {
    if (!session) {
      return { status: "uncertain", error: new RemoteRequestError("runtime", { kind: "network", message: "Not connected" }) };
    }
    setInFlight((current) => new Set(current).add(command.key));
    try {
      return await executePendingCommand(session.client, pendingCommands, command);
    } finally {
      setInFlight((current) => {
        const next = new Set(current);
        next.delete(command.key);
        return next;
      });
    }
  }, [pendingCommands, session]);

  const retry = useCallback(async (key: string) => {
    const command = pendingCommands.get(key);
    return command ? run(command) : null;
  }, [pendingCommands, run]);

  const discard = useCallback((key: string) => pendingCommands.remove(key), [pendingCommands]);
  const pending = useMemo(() => all.filter((command) => command.runtimeId === runtimeId), [all, runtimeId]);
  return { pending, inFlight, run, retry, discard };
}
