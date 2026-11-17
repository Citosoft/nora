import type { RequestResponse } from "@shared/types/conversation/contracts.types";
import type { CommandFactoryDeps, PendingCancelTask, PendingCreateConversation, PendingDecideAction, PendingSendMessage } from "@/types/pendingCommand.types";

/** Stable store keys: one entry per user intent, so repeating the same intent finds (and reuses) the saved IDs. */
export const pendingCommandKeys = Object.freeze({
  send: (runtimeId: string, conversationId: string, runId: string) => `${runtimeId}/send/${conversationId}/${runId}`,
  create: (runtimeId: string, conversationId: string) => `${runtimeId}/create/${conversationId}`,
  decide: (runtimeId: string, requestId: string) => `${runtimeId}/decide/${requestId}`,
  cancel: (runtimeId: string, runId: string) => `${runtimeId}/cancel/${runId}`
});

export function buildSendMessage(deps: CommandFactoryDeps, input: { runtimeId: string; conversationId: string; instruction: string }): PendingSendMessage {
  const runId = deps.createId();
  return {
    kind: "send-message", key: pendingCommandKeys.send(input.runtimeId, input.conversationId, runId), runtimeId: input.runtimeId,
    conversationId: input.conversationId, commandId: deps.createId(), runId, instruction: input.instruction.trim(),
    createdAt: deps.now().toISOString(), lastError: null
  };
}

export function buildCreateConversation(deps: CommandFactoryDeps,
  input: { runtimeId: string; projectId: string; title: string; instruction: string }): PendingCreateConversation {
  const conversationId = deps.createId();
  return {
    kind: "create-conversation", key: pendingCommandKeys.create(input.runtimeId, conversationId), runtimeId: input.runtimeId,
    conversationId, commandId: deps.createId(), projectId: input.projectId, title: input.title.trim(), created: false,
    message: { commandId: deps.createId(), runId: deps.createId(), instruction: input.instruction.trim() },
    createdAt: deps.now().toISOString(), lastError: null
  };
}

export function buildDecideAction(deps: CommandFactoryDeps,
  input: { runtimeId: string; conversationId: string; requestId: string; response: RequestResponse }): PendingDecideAction {
  return {
    kind: "decide-action", key: pendingCommandKeys.decide(input.runtimeId, input.requestId), runtimeId: input.runtimeId,
    conversationId: input.conversationId, commandId: deps.createId(), requestId: input.requestId, response: input.response,
    createdAt: deps.now().toISOString(), lastError: null
  };
}

export function buildCancelTask(deps: CommandFactoryDeps, input: { runtimeId: string; conversationId: string; runId: string }): PendingCancelTask {
  return {
    kind: "cancel-task", key: pendingCommandKeys.cancel(input.runtimeId, input.runId), runtimeId: input.runtimeId,
    conversationId: input.conversationId, commandId: deps.createId(), runId: input.runId, createdAt: deps.now().toISOString(), lastError: null
  };
}
