import { useState } from "react";
import { router } from "expo-router";
import type { CommandRunner, PendingCreateBotChat, PendingCreateConversation } from "@/types/pendingCommand.types";
import { routes } from "@/navigation/routes";

type CreateCommand = PendingCreateConversation | PendingCreateBotChat;

/**
 * Runs a saved "create, then send the first message" command and opens the conversation once accepted. Unsent commands of
 * the same kind stay listed so a lost reply can be retried with the same IDs.
 */
export function useStartCreate<T extends CreateCommand>(runner: CommandRunner, runtimeId: string, kind: T["kind"]) {
  const [error, setError] = useState<string | null>(null);

  const execute = async (command: T): Promise<void> => {
    setError(null);
    const outcome = await runner.run(command);
    if (outcome.status === "accepted") router.replace(routes.conversation(runtimeId, command.conversationId));
    else setError(outcome.error.message);
  };

  const unsent = runner.pending.filter((command): command is T => command.kind === kind);
  return { execute, unsent, error };
}
