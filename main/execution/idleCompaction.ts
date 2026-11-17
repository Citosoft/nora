import { createHash } from "node:crypto";
import { cacheCompactionAdvice } from "@shared/conversations/compaction";
import type { IdleCompactionDependencies } from "@main/types/execution/idleCompaction.types";
import { idleThreadRun } from "./idleThread";
import { ExecutionCommandError } from "./errors";

/** The owning host polls persisted state, so background compaction needs no open renderer or surviving timer. */
export class IdleCompaction {
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private readonly deps: IdleCompactionDependencies) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      try { this.tick(); } catch { this.deps.onError(); }
    }, 30_000);
    this.timer.unref();
  }

  close(): void { clearInterval(this.timer); this.timer = undefined; }

  /** No awaits between revalidating eligibility and durable admission: user activity cannot interleave. */
  tick(): void {
    if (this.deps.mode() !== "before-expiry") return;
    const now = Date.parse(this.deps.now());
    for (const { conversation } of this.deps.store.summaries()) {
      if (conversation.provider.kind !== "claude" || conversation.archivedAt || conversation.queuePaused || !conversation.nativeConversationId
        || cacheCompactionAdvice(conversation.context, now) !== "expiring") continue;
      // Leave startup time for the provider request; never rush an almost-expired cache.
      const expiry = conversation.context?.promptCacheExpiresAt;
      if (!expiry) continue;
      const deadline = Date.parse(expiry) - 30_000;
      if (deadline <= now) continue;
      const last = idleThreadRun(this.deps.store, conversation);
      // A compaction never compacts itself, nor retries a failed/interrupted turn in the background.
      if (!last || last.action) continue;
      const id = `idle-compact:${createHash("sha256").update(JSON.stringify([conversation.id, last.id, conversation.context?.promptCacheExpiresAt])).digest("hex")}`;
      try {
        const provider = this.deps.providers.resolve(conversation.provider.kind, conversation.provider.instanceId);
        if (!provider.capabilities.compaction) continue;
        this.deps.dispatch({ kind: "submit", commandId: id, conversationId: conversation.id, runId: id,
          instruction: "Compact context before estimated cache expiry", action: "compact", compactionDeadline: new Date(deadline).toISOString() });
      } catch (cause) {
        // A checkout or lifecycle conflict is expected; leave the next decision to the user.
        if (!(cause instanceof ExecutionCommandError)) throw cause;
      }
    }
  }
}
