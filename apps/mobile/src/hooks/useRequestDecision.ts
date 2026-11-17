import { useState } from "react";
import type { RequestResponse } from "@shared/types/conversation/contracts.types";
import type { CommandRunner } from "@/types/pendingCommand.types";
import { buildDecideAction } from "@/commands/commandBuilders";
import { useRemoteAccess } from "./useRemoteAccess";

/**
 * Sends an approval or answer. A saved, unconfirmed decision with the same response is resent with its original command
 * ID, so a double tap or a retry after a lost reply cannot decide twice.
 */
export function useRequestDecision(runner: CommandRunner, target: { runtimeId: string; conversationId: string; requestId: string }) {
  const { commandDeps } = useRemoteAccess();
  const [error, setError] = useState<string | null>(null);
  const saved = runner.pending.find((command) => command.kind === "decide-action" && command.requestId === target.requestId);
  const busy = saved ? runner.inFlight.has(saved.key) : false;

  const decide = async (response: RequestResponse): Promise<void> => {
    setError(null);
    const command = saved?.kind === "decide-action" && JSON.stringify(saved.response) === JSON.stringify(response)
      ? saved : buildDecideAction(commandDeps, { ...target, response });
    const outcome = await runner.run(command);
    if (outcome.status !== "accepted") setError(outcome.error.message);
  };
  return { decide, busy, error: error ?? (saved && !busy ? saved.lastError : null) };
}
