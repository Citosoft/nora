import type { CommandRunner, PendingCreateConversation } from "@/types/pendingCommand.types";
import { buildCreateConversation } from "@/commands/commandBuilders";
import { useRemoteAccess } from "./useRemoteAccess";
import { useStartCreate } from "./useStartCreate";

/** Creates a conversation and sends its first message as one saved command, then opens it. */
export function useStartConversation(runner: CommandRunner, runtimeId: string) {
  const { commandDeps } = useRemoteAccess();
  const { execute, unsent, error } = useStartCreate<PendingCreateConversation>(runner, runtimeId, "create-conversation");
  const start = (input: { projectId: string; title: string; instruction: string }): Promise<void> =>
    execute(buildCreateConversation(commandDeps, { runtimeId, ...input }));
  return { start, retry: execute, unsent, error };
}
