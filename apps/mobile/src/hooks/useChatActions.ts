import type { SendMessageRequest } from "@shared/types/remote-access/runtimeApi.types";
import { useCallback, useState } from "react";
import type { CommandRunner } from "@/types/pendingCommand.types";
import { buildCancelTask, buildSendMessage, pendingCommandKeys } from "@/commands/commandBuilders";
import { useRemoteAccess } from "./useRemoteAccess";

/** Send and stop for one conversation, both through the pending-command store. */
export function useChatActions(runner: CommandRunner, runtimeId: string, conversationId: string) {
  const { commandDeps } = useRemoteAccess();
  const [stopError, setStopError] = useState<string | null>(null);

  const send = useCallback(async (instruction: string, providerChange?: SendMessageRequest["providerChange"]): Promise<void> => {
    const outcome = await runner.run(buildSendMessage(commandDeps, { runtimeId, conversationId, instruction, providerChange }));
    if (outcome.status === "rejected") throw outcome.error;
  }, [commandDeps, conversationId, runner, runtimeId]);

  const stop = useCallback(async (runId: string): Promise<void> => {
    setStopError(null);
    const saved = runner.pending.find((command) => command.key === pendingCommandKeys.cancel(runtimeId, runId));
    const outcome = await runner.run(saved ?? buildCancelTask(commandDeps, { runtimeId, conversationId, runId }));
    if (outcome.status !== "accepted") setStopError(outcome.error.message);
  }, [commandDeps, conversationId, runner, runtimeId]);

  const stopping = (runId: string): boolean => runner.inFlight.has(pendingCommandKeys.cancel(runtimeId, runId));
  return { send, stop, stopping, stopError };
}
