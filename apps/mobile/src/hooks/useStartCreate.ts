import { useState } from "react";
import { router } from "expo-router";
import type { CommandOutcome, CommandRunner, PendingCreateCommand } from "@/types/pendingCommand.types";
import { routes } from "@/navigation/routes";

/**
 * Runs a saved "create, then send the first message" command and opens the conversation once accepted. Unsent commands of
 * the same kind stay listed so a lost reply can be retried with the same IDs.
 */
export function useStartCreate<T extends PendingCreateCommand>(runner: CommandRunner, runtimeId: string, kind: T["kind"]) {
  const [error, setError] = useState<string | null>(null);

  const execute = async (command: T): Promise<CommandOutcome> => {
    setError(null);
    const outcome = await runner.run(command);
    if (outcome.status === "accepted") router.replace(routes.conversation(runtimeId, command.conversationId));
    else setError(outcome.error.message);
    return outcome;
  };

  const unsent = runner.pending.filter((command): command is T => command.kind === kind);
  const submit = async (command: T): Promise<void> => {
    const outcome = await execute(command);
    if (outcome.status === "rejected") throw outcome.error;
  };
  return { submit, retry: execute, unsent, error };
}
