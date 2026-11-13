import { createHash } from "node:crypto";
import type { IdleSettlementDependencies } from "@main/types/execution/idleSettlement.types";
import { idleThreadRun } from "./idleThread";
import { ExecutionCommandError } from "./errors";

/** Only completed, unattended threads settle; history remains available and reopening resets the idle period. */
export class IdleSettlement {
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private readonly deps: IdleSettlementDependencies) {}
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { try { this.tick(); } catch { this.deps.onError(); } }, 60_000);
    this.timer.unref();
  }
  close(): void { clearInterval(this.timer); this.timer = undefined; }
  tick(): void {
    const days = this.deps.days();
    if (days === null || !Number.isInteger(days) || days < 1) return;
    const cutoff = Date.parse(this.deps.now()) - days * 86_400_000;
    for (const { conversation } of this.deps.store.summaries()) {
      const lastInteraction = Math.max(Date.parse(conversation.updatedAt), Date.parse(conversation.reopenedAt ?? conversation.updatedAt));
      if (lastInteraction > cutoff || !idleThreadRun(this.deps.store, conversation)) continue;
      const id = `idle-settle:${createHash("sha256").update(JSON.stringify([conversation.id, conversation.updatedAt, conversation.reopenedAt])).digest("hex")}`;
      try { this.deps.dispatch({ kind: "archive", commandId: id, conversationId: conversation.id }); }
      catch (cause) { if (!(cause instanceof ExecutionCommandError)) throw cause; }
    }
  }
}
