import { z } from "zod";
import type { ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { TurnReview } from "@shared/types/conversation/review.types";
import type { TurnUndoAvailability, TurnUndoState } from "@shared/types/conversation/turnUndo.types";
import { isActiveRun } from "./runActivity";

const time = z.string().datetime();
const path = z.string().min(1).max(32_768);

/** `all` changes nothing unless every file can be restored; `unconflicted` restores the rest and reports the conflicts. */
export const turnUndoModeSchema = z.enum(["all", "unconflicted"]);
/** `edited`: the file no longer holds what the turn left. `unrestorable`: its pre-turn bytes were only fingerprinted. */
export const turnUndoConflictSchema = z.object({ path, reason: z.enum(["edited", "unrestorable"]) }).strict();
const conflicts = z.array(turnUndoConflictSchema).max(10_000);

/** Undo progress kept on the turn's review item, so the thread shows it without a separate timeline entry. */
export const turnUndoStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending"), mode: turnUndoModeSchema, requestedAt: time }).strict(),
  z.object({ status: z.literal("undone"), mode: turnUndoModeSchema, at: time, restored: z.array(path).max(10_000), skipped: conflicts }).strict(),
  z.object({ status: z.literal("blocked"), at: time, conflicts: conflicts.min(1) }).strict(),
  /** Restoration stopped part way; `restored` lists what changed, and retrying is safe. */
  z.object({ status: z.literal("failed"), at: time, message: z.string().min(1).max(500), restored: z.array(path).max(10_000) }).strict(),
  /** The turn's snapshots were dropped by retention, so its files can no longer be restored. */
  z.object({ status: z.literal("expired"), at: time }).strict()
]);

/** A review item that observed a turn's own changes, with its review narrowed to turn scope. */
function turnReviewItem(item: TimelineItem | undefined): { review: TurnReview; undo: TurnUndoState | undefined } | null {
  if (item?.kind !== "review" || item.result.status !== "ready" || item.result.scope !== "turn") return null;
  return { review: item.result, undo: item.undo };
}

/** Whether a later reviewed turn changed any of the same files and still stands, which would make undoing this one unsafe. */
function laterTurnOverlaps(items: readonly TimelineItem[], index: number, paths: ReadonlySet<string>): boolean {
  return items.slice(index + 1).some((entry) => {
    const later = turnReviewItem(entry);
    return later !== null && later.undo?.status !== "undone" && later.review.changes.some((change) => paths.has(change.path));
  });
}

/**
 * What the Undo control can offer for one turn's review item: the latest turn, or an older one no later standing turn touched.
 * The host re-checks every file on disk before writing, so this only decides what to offer.
 */
export function turnUndoAvailability(items: readonly TimelineItem[], runs: readonly Pick<ConversationRun, "state">[], itemId: string): TurnUndoAvailability {
  const index = items.findIndex((entry) => entry.id === itemId);
  const item = turnReviewItem(items[index]);
  if (!item || item.review.changes.length === 0) return { kind: "none" };
  const state = item.undo;
  if (state?.status === "pending") return { kind: "pending" };
  if (state?.status === "undone") return { kind: "undone" };
  if (state?.status === "expired") return { kind: "unavailable", reason: "expired" };
  if (laterTurnOverlaps(items, index, new Set(item.review.changes.map((change) => change.path)))) return { kind: "unavailable", reason: "later-turn" };
  if (runs.some(isActiveRun)) return { kind: "unavailable", reason: "busy" };
  return { kind: "available" };
}
