import { createHash } from "node:crypto";
import type { IdleSettlementDependencies } from "@main/types/execution/idleSettlement.types";
import { expiredWorkerStartup } from "./workerStartup";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import { idleThreadRun } from "./idleThread";
import { ExecutionCommandError } from "./errors";

/** Settles completed unattended work and abandoned worker startups; history remains available. */
export class IdleSettlement {
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private readonly deps: IdleSettlementDependencies) {}
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { try { this.tick(); } catch { this.deps.onError(); } }, 60_000);
    this.timer.unref();
    this.tick();
  }
  close(): void { clearInterval(this.timer); this.timer = undefined; }
  tick(): void {
    const now = this.deps.now();
    const days = this.deps.days();
    const settleCompleted = days !== null && Number.isInteger(days) && days >= 1;
    const cutoff = Date.parse(now) - (days ?? 0) * 86_400_000;
    for (const conversation of this.deps.store.maintenanceConversations(settleCompleted ? "all" : "workers")) {
      if (expiredWorkerStartup(this.deps.store, conversation, now)) {
        this.settle(conversation, "worker-without-input");
        continue;
      }
      if (!settleCompleted) continue;
      const lastInteraction = Math.max(Date.parse(conversation.updatedAt), Date.parse(conversation.reopenedAt ?? conversation.updatedAt));
      if (lastInteraction <= cutoff && idleThreadRun(this.deps.store, conversation)) this.settle(conversation, "idle-settle");
    }
  }
  private settle(conversation: Conversation, reason: string): void {
    const id = `${reason}:${createHash("sha256").update(JSON.stringify([conversation.id, conversation.updatedAt, conversation.reopenedAt])).digest("hex")}`;
    try { this.deps.dispatch({ kind: "archive", commandId: id, conversationId: conversation.id }); }
    catch (cause) { if (!(cause instanceof ExecutionCommandError)) throw cause; }
  }
}
