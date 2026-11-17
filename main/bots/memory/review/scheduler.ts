import { memoryOwnerOf } from "@main/bots/memory/owner";
import type { Conversation, ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { MemoryReviewMessage, MemoryReviewScheduler, MemoryReviewSchedulerDeps } from "@main/types/bots/memoryReview.types";
import type { TextGenerationResult } from "@main/types/ai/textGeneration.types";
import { applyMemoryReview } from "./apply";
import { memoryReviewRequest, parseMemoryReview } from "./prompt";

/** Completed turns that trigger a review without waiting for the thread to go quiet. */
export const REVIEW_AFTER_TURNS = 10;
/** A thread with new turns that stays quiet this long is reviewed. */
export const REVIEW_IDLE_MS = 10 * 60_000;
const HISTORY_LIMIT = 200;
const NORA_OWNER = { name: "Nora", role: "the user's assistant in the Nora app" };

/** Group chats run on Nora's coordinator and keep no notes; every other thread belongs to its bot or to Nora. */
const reviewable = (conversation: Conversation): boolean => !conversation.group && !conversation.direct;

/**
 * Reviews threads in the background so notes do not depend on the model calling remember. It counts completed turns per
 * thread and reviews after REVIEW_AFTER_TURNS, after REVIEW_IDLE_MS of quiet, or when the thread is settled. Reviews run one
 * at a time and read only messages newer than the thread's saved cursor; a failed review still moves the count on, so a
 * failing model is not asked again after every turn. Every review that calls a model is logged with its usage.
 */
export function createMemoryReviewScheduler(deps: MemoryReviewSchedulerDeps): MemoryReviewScheduler {
  const clock = deps.clock ?? Date.now;
  const schedule = deps.schedule ?? ((callback, delayMs) => { const timer = setTimeout(callback, delayMs); timer.unref?.(); return () => clearTimeout(timer); });
  const pending = new Map<string, { turns: Set<string>; cancel: (() => void) | null }>();
  const queued = new Set<string>();
  let chain: Promise<void> = Promise.resolve();
  let unsubscribe: (() => void) | null = null;
  let controller = new AbortController();

  const clear = (conversationId: string): void => { pending.get(conversationId)?.cancel?.(); pending.delete(conversationId); };

  const enqueue = (conversationId: string): void => {
    if (queued.has(conversationId) || !unsubscribe) return;
    queued.add(conversationId);
    chain = chain.then(() => review(conversationId)).catch(deps.onError).finally(() => { queued.delete(conversationId); });
  };

  const armIdle = (conversationId: string): void => {
    const entry = pending.get(conversationId);
    if (!entry) return;
    entry.cancel?.();
    entry.cancel = schedule(() => enqueue(conversationId), REVIEW_IDLE_MS);
  };

  const newMessages = (conversationId: string, after: string | null): MemoryReviewMessage[] => {
    const page = deps.host.conversationHistory({ conversationId, scope: "timeline", limit: HISTORY_LIMIT });
    if (page.scope !== "timeline") return [];
    return page.items.flatMap((item): MemoryReviewMessage[] => item.kind === "message" && item.complete && item.text.trim() && (!after || item.createdAt > after)
      ? [{ role: item.role, text: item.text, createdAt: item.createdAt }] : []);
  };

  async function review(conversationId: string): Promise<void> {
    const header = deps.host.header(conversationId);
    if (!header || !reviewable(header.conversation) || !deps.enabled()) { clear(conversationId); return; }
    // A turn that started since the trigger is still writing; review once it has finished and the thread is quiet again.
    if (header.activeRuns.length) { armIdle(conversationId); return; }
    clear(conversationId);
    const { conversation } = header;
    const messages = newMessages(conversationId, deps.memory.reviewedThrough(conversationId));
    const last = messages.at(-1);
    if (!last) return;
    // Mark first: a failing or slow model must not make the next review read the same messages again.
    deps.memory.markReviewed(conversationId, last.createdAt);
    if (!messages.some((message) => message.role === "user")) return;
    const ownerId = memoryOwnerOf(conversation);
    const workspaceId = conversation.workspace.projectId;
    const owner = conversation.bot ? { name: conversation.bot.name, role: conversation.bot.role } : NORA_OWNER;
    const started = clock();
    const entry = { conversationId, threadTitle: conversation.title, ownerName: owner.name, at: new Date(started).toISOString() };
    let result: TextGenerationResult | null = null;
    try {
      result = await deps.generate(memoryReviewRequest({ owner, notes: deps.memory.list(ownerId, workspaceId), messages }, controller.signal));
      const outcome = applyMemoryReview(deps.memory, { ownerId, workspaceId, conversationId }, parseMemoryReview(result.text));
      deps.log.record({ ...entry, durationMs: clock() - started, provider: result.provider, model: result.model, status: "completed", outcome,
        usage: result.usage, error: null });
    } catch (error) {
      // Stopping the app aborts a review in flight; that is not a failure worth recording.
      if (!controller.signal.aborted) {
        const source = result ?? deps.source();
        deps.log.record({ ...entry, durationMs: clock() - started, provider: source.provider, model: source.model, status: "failed", outcome: null,
          usage: result?.usage ?? null, error: error instanceof Error ? error.message : "The review failed." });
      }
      throw error;
    }
  }

  const onEvent = (event: ConversationEvent): void => {
    const { payload, conversationId } = event;
    if (payload.kind === "run" && payload.run.state === "completed" && !payload.run.action) {
      const entry = pending.get(conversationId) ?? { turns: new Set<string>(), cancel: null };
      pending.set(conversationId, entry);
      entry.turns.add(payload.run.id);
      if (entry.turns.size >= REVIEW_AFTER_TURNS) enqueue(conversationId);
      else armIdle(conversationId);
    } else if (payload.kind === "conversation" && payload.conversation.archivedAt && pending.has(conversationId)) {
      enqueue(conversationId);
    }
  };

  return {
    start() {
      if (unsubscribe) return;
      controller = new AbortController();
      unsubscribe = deps.host.subscribe({ after: deps.host.eventCursor(), onEvent, onError: deps.onError });
    },
    stop() {
      unsubscribe?.(); unsubscribe = null;
      controller.abort();
      for (const conversationId of [...pending.keys()]) clear(conversationId);
    },
    idle: () => chain
  };
}
