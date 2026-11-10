import { conversationCommandSchema, workspaceRefSchema } from "@shared/conversations/contracts";
import type { CommandReceipt, ConversationCommand, ConversationSnapshot, EventPayload, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ActiveSubscription, EngineDependencies, EventSubscription } from "@main/types/execution/engine.types";
import type { StoreTransaction, ExecutionEffect } from "@main/types/execution/store.types";
import type { ProviderUpdate } from "@main/types/execution/provider.types";
import { decideCommand } from "./decideCommand";
import { decideUpdate } from "./decideUpdate";
import { ExecutionCommandError } from "./errors";
import { isActiveRun } from "./projection";
import { providerUpdateSchema } from "./providerUpdateSchema";
import { commandFingerprint } from "./commandIdentity";
import { finalizeReview } from "./finalizeReview";
import { recoverExecution } from "./recoverExecution";
import { conversationReviewSchema } from "@shared/conversations/review";
import type { ConversationReview } from "@shared/types/conversation/review.types";
import type { CheckpointCapture } from "@main/types/execution/checkpoints.types";
import { recordCheckpoint } from "./checkpoints/record";
import { hasPendingCheckpointReview } from "./checkpoints/admission";
import type { RoleSelection } from "@shared/types/personalization/roles.types";

export class ConversationEngine {
  private readonly subscriptions = new Set<ActiveSubscription>();
  constructor(private readonly deps: EngineDependencies) {}

  private commitEvents(transaction: StoreTransaction, conversationId: string, at: string, payloads: EventPayload[]): number {
    for (const payload of payloads) {
      const event = transaction.appendEvent(this.deps.nextId(), conversationId, at, payload);
      transaction.project(event);
    }
    return transaction.cursor();
  }

  /** Durable retry lookup precedes filesystem preparation, so retries survive later workspace changes. */
  receipt(input: ConversationCommand): CommandReceipt | null {
    this.deps.assertOwnership();
    const command = conversationCommandSchema.parse(input);
    const previous = this.deps.store.receipt(JSON.stringify(["command", command.conversationId, command.commandId]));
    if (!previous) return null;
    if (previous.fingerprint !== commandFingerprint(command)) throw new ExecutionCommandError("conflict", "Command ID was already used with different content");
    return previous.receipt;
  }

  execute(input: ConversationCommand, preparedWorkspace?: WorkspaceRef, preparedRole?: RoleSelection | null): CommandReceipt {
    this.deps.assertOwnership();
    const command = conversationCommandSchema.parse(input);
    const decisionCommand = command.kind === "create"
      ? { ...command, ...(preparedWorkspace ? { workspace: workspaceRefSchema.parse(preparedWorkspace) } : {}),
        ...(preparedRole ? { role: preparedRole } : {}) } : command;
    const fingerprint = commandFingerprint(command);
    const key = JSON.stringify(["command", command.conversationId, command.commandId]);
    const result = this.deps.store.transaction((transaction) => {
      const previous = transaction.receipt(key);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new ExecutionCommandError("conflict", "Command ID was already used with different content");
        return previous.receipt;
      }
      const now = this.deps.now();
      const state = transaction.state(command.conversationId, "runId" in command ? command.runId : undefined);
      const decision = decideCommand(decisionCommand, { now, environmentId: this.deps.store.environmentId, state,
        writers: state ? transaction.writers(state.conversation.workspace) : [], effects: transaction.unfinishedEffects() });
      const cursor = this.commitEvents(transaction, command.conversationId, now, decision.events);
      for (const effect of decision.effects) transaction.putEffect(effect);
      const receipt = { commandId: command.commandId, conversationId: command.conversationId, cursor, acceptedAt: now };
      transaction.putReceipt({ key, fingerprint, receipt });
      return receipt;
    });
    this.publish();
    return result;
  }

  accept(input: ProviderUpdate): void {
    this.deps.assertOwnership();
    const update = providerUpdateSchema.parse(input);
    const commandId = JSON.stringify(["provider", update.conversationId, update.attemptId, update.eventId]);
    const fingerprint = commandFingerprint(update);
    this.deps.store.transaction((transaction) => {
      const previous = transaction.receipt(commandId);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new ExecutionCommandError("conflict", "Provider event identity was reused with different content");
        return;
      }
      const snapshot = transaction.state(update.conversationId, update.runId);
      if (!snapshot) throw new ExecutionCommandError("missing", "Provider update has no owning conversation");
      const now = this.deps.now();
      const decision = decideUpdate(snapshot, update, { now, environmentId: this.deps.store.environmentId, state: snapshot,
        writers: transaction.writers(snapshot.conversation.workspace), effects: transaction.unfinishedEffects(),
        previousItem: update.kind === "item" ? transaction.item(update.conversationId, update.item.id) : null,
        previousRequest: update.kind === "request" ? transaction.request(update.conversationId, update.request.id) : null });
      if (decision.events.some((payload) => payload.kind === "run" && payload.run.state === "recovering")) {
        const checkpoint = transaction.checkpoint(update.conversationId, update.runId);
        if (checkpoint && !checkpoint.final) transaction.putCheckpoint({ ...checkpoint, continuity: "interrupted" });
      }
      const cursor = this.commitEvents(transaction, update.conversationId, now, decision.events);
      for (const effect of decision.effects) transaction.putEffect(effect);
      transaction.putReceipt({ key: commandId, fingerprint, receipt: { commandId, conversationId: update.conversationId, cursor, acceptedAt: now } });
    });
    this.publish();
  }

  snapshot(conversationId: string): ConversationSnapshot | null { return this.deps.store.snapshot(conversationId); }
  execution(conversationId: string, runId: string) { return this.deps.store.execution(conversationId, runId); }
  checkpoint(conversationId: string, runId: string) { return this.deps.store.checkpoint(conversationId, runId); }

  recordCheckpoint(effectId: string, phase: "baseline" | "final", capture: CheckpointCapture): boolean {
    this.deps.assertOwnership();
    return this.deps.store.transaction((transaction) => recordCheckpoint(transaction, effectId, phase, capture));
  }

  claimEffect(allowed?: readonly ExecutionEffect["action"]["kind"][]): ExecutionEffect | null {
    this.deps.assertOwnership();
    return this.deps.store.transaction((transaction) => {
      for (const effect of transaction.unfinishedEffects()) {
        if (effect.status !== "pending") continue;
        if (allowed && !allowed.includes(effect.action.kind)) continue;
        const snapshot = transaction.state(effect.conversationId, effect.runId);
        const run = snapshot?.runs.find((entry) => entry.id === effect.runId && entry.attemptId === effect.attemptId);
        const reviewable = run && !isActiveRun(run) && run.state !== "queued" && run.review === "pending";
        if (!run || (effect.action.kind === "review" ? !reviewable : !isActiveRun(run))) {
          transaction.putEffect({ ...effect, status: "done" }); continue;
        }
        if (run.state === "recovering" && effect.action.kind !== "reconcile") {
          transaction.putEffect({ ...effect, status: "done" }); continue;
        }
        if (effect.action.kind === "start" && run.state === "stopping") {
          transaction.putEffect({ ...effect, status: "done" });
          continue;
        }
        if (effect.action.kind === "start" && snapshot && hasPendingCheckpointReview(transaction, snapshot.conversation.workspace)) continue;
        if (effect.action.kind === "respond") {
          const { requestId } = effect.action;
          const request = snapshot?.requests.find((entry) => entry.id === requestId);
          if (!request || request.status !== "responding" || Date.parse(request.expiresAt) <= Date.parse(this.deps.now())) {
            transaction.putEffect({ ...effect, status: "done" });
            continue;
          }
        }
        const claimed = { ...effect, status: "claimed" as const };
        transaction.putEffect(claimed);
        return claimed;
      }
      return null;
    });
  }

  finishEffect(effectId: string): void {
    this.deps.assertOwnership();
    this.deps.store.transaction((transaction) => {
      const effect = transaction.effect(effectId);
      if (!effect || effect.status !== "claimed") throw new ExecutionCommandError("conflict", "Effect is not claimed");
      if (effect.action.kind === "review") throw new ExecutionCommandError("conflict", "Review evidence must be finalized before retiring its effect");
      transaction.putEffect({ ...effect, status: "done" });
    });
  }

  finishReview(effectId: string, input: ConversationReview): void {
    this.deps.assertOwnership();
    const result = conversationReviewSchema.parse(input);
    this.deps.store.transaction((transaction) => {
      const effect = transaction.effect(effectId);
      if (!effect || effect.action.kind !== "review") throw new ExecutionCommandError("conflict", "Effect is not a review");
      if (effect.status === "done") return;
      if (effect.status !== "claimed") throw new ExecutionCommandError("conflict", "Review is not claimed");
      finalizeReview(transaction, effect, result, this.deps.now(), this.deps.nextId);
    });
    this.publish();
  }

  expireRequests(): void {
    this.deps.assertOwnership();
    const now = Date.parse(this.deps.now());
    for (const snapshot of this.deps.store.activeStates()) {
      for (const request of snapshot.requests) {
        if (!["pending", "responding"].includes(request.status) || Date.parse(request.expiresAt) > now) continue;
        this.accept({ kind: "request-expired", eventId: `expired:${request.id}`, conversationId: snapshot.conversation.id,
          runId: request.runId, attemptId: request.attemptId, requestId: request.id });
      }
    }
  }

  /** Invoke only after acquiring sole host ownership, before starting this host's workers. */
  recover(): void {
    this.deps.assertOwnership();
    this.deps.store.transaction((transaction) => {
      const now = this.deps.now();
      recoverExecution(transaction, now, this.deps.nextId);
    });
    this.publish();
  }

  subscribe(input: EventSubscription): () => void {
    if (!Number.isSafeInteger(input.after) || input.after < 0 || input.after > this.deps.store.cursor()) {
      throw new ExecutionCommandError("cursor", "Event cursor is unavailable; hydrate a new snapshot");
    }
    const subscription: ActiveSubscription = { ...input, cursor: input.after, draining: false };
    // Register before replay; reentrant writes are picked up by the same cursor drain.
    this.subscriptions.add(subscription);
    this.drain(subscription);
    return () => { this.subscriptions.delete(subscription); };
  }

  private drain(subscription: ActiveSubscription): void {
    if (subscription.draining) return;
    subscription.draining = true;
    try {
      while (this.subscriptions.has(subscription)) {
        const events = this.deps.store.events(subscription.cursor, 200, subscription.conversationId);
        if (!events.length) break;
        for (const event of events) {
          if (!this.subscriptions.has(subscription)) break;
          subscription.cursor = event.cursor;
          subscription.onEvent(event);
        }
      }
    } catch (error) {
      this.subscriptions.delete(subscription);
      try {
        subscription.onError(error instanceof Error ? error : new Error("Event subscription failed"));
      } catch {
        // Observers must never turn a committed command into an apparent rejection.
      }
    } finally { subscription.draining = false; }
  }

  private publish(): void {
    for (const subscription of this.subscriptions) this.drain(subscription);
  }
}
