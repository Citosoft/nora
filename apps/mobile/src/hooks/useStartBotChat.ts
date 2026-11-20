import type { RemoteBot } from "@shared/types/remote-access/runtimeApi.types";
import type { CommandRunner, PendingCreateBotChat } from "@/types/pendingCommand.types";
import { buildCreateBotChat } from "@/commands/commandBuilders";
import { useRemoteAccess } from "./useRemoteAccess";
import { useStartCreate } from "./useStartCreate";

/** Starts a bot's direct chat with the user's first message as one saved command, then opens the chat. */
export function useStartBotChat(runner: CommandRunner, runtimeId: string) {
  const { commandDeps } = useRemoteAccess();
  const { execute, unsent, error } = useStartCreate<PendingCreateBotChat>(runner, runtimeId, "create-bot-chat");
  const start = (input: { bot: Pick<RemoteBot, "id" | "name" | "scope">; instruction: string }): Promise<void> =>
    execute(buildCreateBotChat(commandDeps, { runtimeId, ...input }));
  return { start, retry: execute, unsent, error };
}
