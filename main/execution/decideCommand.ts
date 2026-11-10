import type { ConversationCommand, ConversationRun, RequestResponse, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { Decision, DecisionContext } from "@main/types/execution/decisions.types";
import { ExecutionCommandError } from "./errors";
import { isActiveRun, projectState } from "./projection";
import { snapshotRole } from "@shared/personalization/profiles";

export function validateResponse(request: RuntimeRequest, response: RequestResponse): void {
  if (request.kind === "approval" && response.kind === "approval") {
    if (request.options.some((option) => option.id === response.optionId)) return;
  }
  if (request.kind === "question" && response.kind === "question") {
    const keys = Object.keys(response.answers);
    if (keys.length === request.questions.length && request.questions.every((question) => {
      const answers = response.answers[question.id];
      return answers?.length && (question.multiple || answers.length === 1)
        && (!question.options.length || answers.every((answer) => question.options.includes(answer)));
    })) return;
  }
  throw new ExecutionCommandError("invalid", "Response is not one of this request's supported choices");
}

export function decideCommand(command: ConversationCommand, context: DecisionContext): Decision {
  const decision: Decision = { events: [], effects: [] };
  let state = context.state;
  const add = (payload: Decision["events"][number]): void => {
    decision.events.push(payload);
    state = projectState(state, payload);
  };
  if (command.kind === "create") {
    if (state) throw new ExecutionCommandError("conflict", "Conversation already exists");
    if (command.workspace.environmentId !== context.environmentId) {
      throw new ExecutionCommandError("environment", "Workspace belongs to a different execution host");
    }
    add({ kind: "conversation", conversation: {
      ...(command.source ? { source: command.source } : {}),
      id: command.conversationId, title: command.title, workspace: command.workspace,
      role: command.role ? snapshotRole(command.role) : null,
      provider: command.provider, parentId: command.parentId, nativeConversationId: null,
      archivedAt: null, queuePaused: false, createdAt: context.now, updatedAt: context.now
    } });
    return decision;
  }
  if (!state) throw new ExecutionCommandError("missing", "Conversation does not exist");
  if (state.conversation.archivedAt) throw new ExecutionCommandError("conflict", "Conversation is archived");
  const initial = state;
  const run = "runId" in command ? initial.runs.find((entry) => entry.id === command.runId) : undefined;
  const assertWriter = (): void => {
    const workspace = initial.conversation.workspace;
    const conflict = workspace.access === "write" && context.writers.some((id) => id !== command.conversationId);
    if (conflict) throw new ExecutionCommandError("conflict", "Another conversation is writing to this checkout; choose an isolated worktree");
  };
  const putRun = (next: ConversationRun): void => add({ kind: "run", run: { ...next, updatedAt: context.now } });
  switch (command.kind) {
    case "submit": {
      if (run) throw new ExecutionCommandError("conflict", "Instruction identity already exists");
      assertWriter();
      add({ kind: "conversation", conversation: { ...initial.conversation, updatedAt: context.now } });
      putRun({ id: command.runId, conversationId: command.conversationId, instruction: command.instruction,
        attemptId: JSON.stringify([command.conversationId, command.runId, 1]), nativeTurnId: null,
        state: "queued", createdAt: context.now, updatedAt: context.now, failure: null, usage: null, review: "pending" });
      break;
    }
    case "edit-queued":
    case "remove-queued": {
      if (!run || run.state !== "queued") throw new ExecutionCommandError("conflict", "Only unsent queued instructions can be edited or removed");
      if (command.kind === "edit-queued") putRun({ ...run, instruction: command.instruction });
      else add({ kind: "remove-run", runId: run.id });
      break;
    }
    case "continue-queue":
      assertWriter();
      add({ kind: "conversation", conversation: { ...initial.conversation, queuePaused: false, updatedAt: context.now } });
      break;
    case "reconcile":
      if (!run || run.state !== "recovering") throw new ExecutionCommandError("conflict", "Only uncertain execution needs a native status check");
      if (!context.effects.some((effect) => effect.conversationId === command.conversationId && effect.attemptId === run.attemptId
        && effect.action.kind === "reconcile" && effect.status !== "done")) {
        decision.effects.push({ id: JSON.stringify([run.attemptId, "reconcile", command.commandId]), conversationId: command.conversationId,
          runId: run.id, attemptId: run.attemptId, status: "pending", action: { kind: "reconcile" } });
      }
      add({ kind: "conversation", conversation: { ...initial.conversation, updatedAt: context.now } });
      return decision;
    case "archive":
      if (initial.runs.some((entry) => isActiveRun(entry) || entry.state === "queued")) {
        throw new ExecutionCommandError("conflict", "Stop active work and remove queued instructions before archiving");
      }
      add({ kind: "conversation", conversation: { ...initial.conversation, archivedAt: context.now, updatedAt: context.now } });
      return decision;
    case "interrupt":
      if (!run || !isActiveRun(run) || run.state === "recovering") {
        throw new ExecutionCommandError("conflict", "No confirmed active turn is available to interrupt");
      }
      if (run.state === "stopping") return decision;
      if (run.state === "starting") {
        const start = context.effects.find((effect) => effect.conversationId === command.conversationId
          && effect.attemptId === run.attemptId && effect.action.kind === "start" && effect.status === "pending");
        if (start) {
          putRun({ ...run, state: "interrupted", review: "unavailable" });
          add({ kind: "conversation", conversation: { ...initial.conversation, queuePaused: true, updatedAt: context.now } });
          decision.effects.push({ ...start, status: "done" });
          return decision;
        }
      }
      putRun({ ...run, state: "stopping" });
      for (const request of initial.requests.filter((entry) => entry.runId === run.id && ["pending", "responding"].includes(entry.status))) {
        add({ kind: "request", request: { ...request, status: "expired" } });
      }
      add({ kind: "conversation", conversation: { ...initial.conversation, queuePaused: true, updatedAt: context.now } });
      decision.effects.push({ id: JSON.stringify([run.attemptId, "interrupt"]), conversationId: command.conversationId,
        runId: run.id, attemptId: run.attemptId, status: "pending", action: { kind: "interrupt" } });
      return decision;
    case "respond": {
      const request = initial.requests.find((entry) => entry.id === command.requestId);
      const owner = request && initial.runs.find((entry) => entry.id === request.runId);
      if (!request || request.status !== "pending" || Date.parse(request.expiresAt) <= Date.parse(context.now)
        || !owner || owner.attemptId !== request.attemptId || !["awaiting-approval", "awaiting-input"].includes(owner.state)) {
        throw new ExecutionCommandError("expired", "This native request is no longer answerable");
      }
      validateResponse(request, command.response);
      add({ kind: "request", request: { ...request, status: "responding" } });
      decision.effects.push({ id: JSON.stringify([request.attemptId, request.id, "respond"]), conversationId: command.conversationId,
        runId: request.runId, attemptId: request.attemptId, status: "pending",
        action: { kind: "respond", requestId: request.id, response: command.response } });
      return decision;
    }
  }
  if (state && !state.conversation.queuePaused && !state.runs.some(isActiveRun)) {
    const next = state.runs.find((entry) => entry.state === "queued");
    if (next) {
      assertWriter();
      putRun({ ...next, state: "starting" });
      add({ kind: "item", item: { id: JSON.stringify([next.id, "instruction"]), runId: next.id,
        createdAt: context.now, kind: "message", role: "user", text: next.instruction, complete: true } });
      decision.effects.push({ id: JSON.stringify([next.attemptId, "start"]), conversationId: command.conversationId,
        runId: next.id, attemptId: next.attemptId, status: "pending", action: { kind: "start" } });
    }
  }
  return decision;
}
