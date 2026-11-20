import { basename } from "node:path";
import { secretLocation } from "@main/secrets/store";
import type { SecretOrigin } from "@main/types/secrets/secrets.types";
import type { NoraSecretOperations, NoraToolContext } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

/** Bounds the walk up a thread's parents; ask chains are far shallower than this. */
const ANCESTORS_MAX = 8;

/** Scopes every secret operation to the calling thread's workspace and tells the window which threads may show its prompts. */
export function createSecretOperations(options: Pick<NoraToolOperationOptions, "host" | "boot" | "secrets">): NoraSecretOperations {
  const originOf = ({ conversation }: NoraToolContext): SecretOrigin => {
    // A bot asked from another thread or a chat runs where the user is not looking, so its parents show the prompt too.
    const conversationIds = [conversation.id];
    for (let parentId = conversation.parentId; parentId && conversationIds.length <= ANCESTORS_MAX && !conversationIds.includes(parentId);
      parentId = options.host.header(parentId)?.conversation.parentId ?? null) conversationIds.push(parentId);
    const { projectId, path } = conversation.workspace;
    return { conversationId: conversation.id, conversationIds, requester: conversation.bot?.name ?? "Nora", projectId,
      workspaceName: options.boot().workspaces.find((workspace) => workspace.id === projectId)?.name ?? basename(path) };
  };
  return {
    request: (input, context, signal) => options.secrets.request(input, originOf(context), signal),
    list: ({ conversation }) => options.secrets.list(conversation.workspace.projectId),
    remove: (name, scope, { conversation }) => options.secrets.remove(secretLocation(name, scope, conversation.workspace.projectId)),
    run(input, context, signal) {
      const { access, path } = context.conversation.workspace;
      if (access !== "write") throw new Error("This thread has read-only access to its workspace, so it cannot run commands with secrets.");
      return options.secrets.run({ command: input.command, secrets: input.secrets, timeoutMs: input.timeoutSeconds * 1000, cwd: path }, originOf(context), signal);
    }
  };
}
