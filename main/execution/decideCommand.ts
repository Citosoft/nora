import type { ConversationCommand, ConversationRun, RequestResponse, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { Decision, DecisionContext } from "@main/types/execution/decisions.types";
import { ExecutionCommandError } from "./errors";
import { isActiveRun, projectState } from "./projection";
import { snapshotRole } from "@shared/personalization/profiles";
import { NORA_PROVIDER_KIND } from "@shared/providers/providerKinds";
import { areQuestionAnswersComplete } from "@shared/conversations/questionAnswers";
import { steeringTarget } from "./steeringAdmission";
import { sameProviderBinding } from "@shared/conversations/providerBinding";

export function validateResponse(request: RuntimeRequest, response: RequestResponse): void {
  if (request.kind === "approval" && response.kind === "approval") {
    if (request.options.some((option) => option.id === response.optionId)) return;
  }
  if (request.kind === "question" && response.kind === "question") {
    const keys = Object.keys(response.answers);
    if (keys.length === request.questions.length && areQuestionAnswersComplete(request.questions, response.answers)) return;
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
    if (command.botId && command.role) throw new ExecutionCommandError("invalid", "A bot thread cannot also carry a role");
    if (command.botId !== context.bot?.botId) throw new ExecutionCommandError("invalid", "The bot for this thread could not be resolved");
    if (command.group && (command.botId || command.role)) throw new ExecutionCommandError("invalid", "A group chat cannot also be a bot thread or carry a role");
    if (!!command.group !== !!context.group || (command.group && command.provider.kind !== NORA_PROVIDER_KIND)) {
      throw new ExecutionCommandError("invalid", "The group chat's members could not be resolved");
    }
    add({ kind: "conversation", conversation: {
      ...(command.source ? { source: command.source } : {}),
      id: command.conversationId, title: command.title,
      // A group never writes itself; only its writer member's thread may.
      workspace: context.group ? { ...command.workspace, access: "read" } : command.workspace,
      role: command.role && !context.bot && !context.group ? snapshotRole(command.role) : null,
      ...(context.bot ? { bot: context.bot } : {}), ...(context.group ? { group: context.group } : {}),
      provider: command.provider, parentId: command.parentId, nativeConversationId: null,
      archivedAt: null, queuePaused: false, createdAt: context.now, updatedAt: context.now
    } });
    return decision;
  }
  if (!state) throw new ExecutionCommandError("missing", "Conversation does not exist");
  if (command.kind === "rename") {
    // Renaming is bookkeeping, not activity: it leaves `updatedAt` alone so the thread keeps its place in recency-sorted lists.
    if (state.conversation.title !== command.title) add({ kind: "conversation", conversation: { ...state.conversation, title: command.title } });
    return decision;
  }
  if (command.kind === "unarchive") {
    if (state.conversation.archivedAt) add({ kind: "conversation", conversation: { ...state.conversation, archivedAt: null, reopenedAt: context.now } });
    return decision;
  }
  if (state.conversation.archivedAt) {
    if (command.kind === "archive") return decision;
    throw new ExecutionCommandError("conflict", "This thread is settled. Reopen it before continuing");
  }
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
      if (command.compactionDeadline && command.action !== "compact") throw new ExecutionCommandError("invalid", "Only automatic compaction can have a deadline");
      if (run) throw new ExecutionCommandError("conflict", "Instruction identity already exists");
      assertWriter();
      const change = command.providerChange;
      if (change && (command.action || !context.providerTransition || !sameProviderBinding(change.expected, initial.conversation.provider)
        || !sameProviderBinding(context.providerTransition.handoff.previousProvider, change.expected) || sameProviderBinding(change.expected, change.next))) {
        throw new ExecutionCommandError("conflict", "The provider handoff does not match this chat. Reload before changing providers.");
      }
      const conversation = { ...initial.conversation, ...(change ? { provider: change.next, nativeConversationId: null, pendingHandoffRunId: command.runId, context: null, queuePaused: false } : {}), updatedAt: context.now };
      add({ kind: "conversation", conversation });
      if (change) add({ kind: "item", item: { kind: "milestone", id: JSON.stringify([command.runId, "provider-change"]), runId: command.runId, createdAt: context.now,
        text: `Continued from ${change.expected.kind} / ${change.expected.model} to ${change.next.kind} / ${change.next.model} in a fresh session with a saved history handoff.` } });
      putRun({ id: command.runId, conversationId: command.conversationId, instruction: command.instruction,
        provider: conversation.provider,
        ...(change && context.providerTransition ? { handoff: context.providerTransition.handoff } : {}),
        ...(command.action ? { action: command.action } : {}),
        ...(command.compactionDeadline ? { compactionDeadline: command.compactionDeadline } : {}),
        attemptId: JSON.stringify([command.conversationId, command.runId, 1]), nativeTurnId: null,
        state: "queued", createdAt: context.now, updatedAt: context.now, failure: null, usage: null, review: "pending" });
      const target = context.steerFollowUp && !command.action && !change ? steeringTarget(initial) : null;
      if (target) {
        const steering = decideCommand({ kind: "steer-queued", commandId: command.commandId, conversationId: command.conversationId,
          runId: command.runId, targetRunId: target.id }, { ...context, state });
        decision.events.push(...steering.events); decision.effects.push(...steering.effects);
        return decision;
      }
      break;
    }
    case "edit-queued":
    case "remove-queued": {
      if (!run || run.state !== "queued") throw new ExecutionCommandError("conflict", "Only unsent queued instructions can be edited or removed");
      if (run.action && command.kind === "edit-queued") throw new ExecutionCommandError("conflict", "Context compaction has no instruction to edit");
      if (run.steering === "pending" || (run.steering && command.kind === "edit-queued")) throw new ExecutionCommandError("conflict", "Confirm steering delivery before editing this message");
      if (command.kind === "edit-queued") putRun({ ...run, instruction: command.instruction });
      else add({ kind: "remove-run", runId: run.id });
      break;
    }
    case "steer-queued": {
      const target = initial.runs.find((entry) => entry.id === command.targetRunId);
      if (!run || run.state !== "queued" || run.steering || run.action || !target || steeringTarget(initial)?.id !== target.id) {
        throw new ExecutionCommandError("conflict", "Steering requires an unsent message and a confirmed running turn");
      }
      assertWriter();
      putRun({ ...run, steering: "pending", failure: null });
      decision.effects.push({ id: JSON.stringify([command.commandId, "steer"]), conversationId: command.conversationId, runId: target.id,
        attemptId: target.attemptId, status: "pending", action: { kind: "steer", queuedRunId: run.id, instruction: run.instruction } });
      return decision;
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
        throw new ExecutionCommandError("conflict", "Stop active work and remove queued instructions before settling this thread");
      }
      add({ kind: "conversation", conversation: { ...initial.conversation, archivedAt: context.now } });
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
  if (state && !state.conversation.queuePaused && !state.runs.some(isActiveRun) && !state.runs.some((entry) => entry.steering)) {
    const next = state.runs.find((entry) => entry.state === "queued");
    if (next) {
      assertWriter();
      putRun({ ...next, state: "starting", startedAt: context.now });
      const instructionId = JSON.stringify([next.id, "instruction"]);
      add({ kind: "item", item: next.action === "compact"
        ? { id: instructionId, runId: next.id, createdAt: context.now, kind: "milestone", text: next.instruction }
        : { id: instructionId, runId: next.id, createdAt: context.now, kind: "message", role: "user", text: next.instruction, complete: true } });
      decision.effects.push({ id: JSON.stringify([next.attemptId, "start"]), conversationId: command.conversationId,
        runId: next.id, attemptId: next.attemptId, status: "pending", action: { kind: "start" } });
    }
  }
  return decision;
}
