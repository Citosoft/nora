import { useState } from "react";
import { router } from "expo-router";
import type { CommandRunner, PendingCreateConversation } from "@/types/pendingCommand.types";
import { buildCreateConversation } from "@/commands/commandBuilders";
import { routes } from "@/navigation/routes";
import { useRemoteAccess } from "./useRemoteAccess";

/** Creates a conversation and sends its first message as one saved command, then opens it. */
export function useStartConversation(runner: CommandRunner, runtimeId: string) {
  const { commandDeps } = useRemoteAccess();
  const [error, setError] = useState<string | null>(null);

  const execute = async (command: PendingCreateConversation): Promise<void> => {
    setError(null);
    const outcome = await runner.run(command);
    if (outcome.status === "accepted") router.replace(routes.conversation(runtimeId, command.conversationId));
    else setError(outcome.error.message);
  };

  const start = (input: { projectId: string; title: string; instruction: string }): Promise<void> =>
    execute(buildCreateConversation(commandDeps, { runtimeId, ...input }));

  const unsent = runner.pending.filter((command): command is PendingCreateConversation => command.kind === "create-conversation");
  return { start, retry: execute, unsent, error };
}
