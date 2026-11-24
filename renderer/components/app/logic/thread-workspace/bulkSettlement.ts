import { canSettleThread } from "./settlement";
import type { ThreadListRow } from "@/components/app/types/thread-workspace/list.types";
import type { BulkSettlementInput, BulkSettlementResult } from "@/components/app/types/thread-workspace/bulkSettlement.types";

export const settlementAgeOptions = [1, 7, 14, 30, 90] as const;
export const DEFAULT_SETTLEMENT_AGE = 7;

export function canBulkSettleThread(row: ThreadListRow): boolean {
  return !row.settled && canSettleThread(row);
}

/** Age means last activity, so an old thread with a recent reply stays unchecked. */
export function preselectSettlements(rows: readonly ThreadListRow[], days: number, now: number): Set<string> {
  const cutoff = now - days * 86400_000;
  return new Set(rows.filter((row) => canBulkSettleThread(row) && !row.pinned && !row.attention && !row.waitingOn
    && Date.parse(row.updatedAt) < cutoff).map((row) => row.id));
}

/** Importing an outside thread and updating the layout must finish before the next settlement. */
export async function settleThreadBatch({ ids, findRow, settle, onProgress }: BulkSettlementInput): Promise<BulkSettlementResult> {
  const result: BulkSettlementResult = { completed: [], errors: {} };
  let processed = 0;
  for (const id of new Set(ids)) {
    const row = findRow(id);
    try {
      if (!row || !canBulkSettleThread(row)) throw new Error("This thread is no longer available to settle.");
      await settle(row);
      result.completed.push(id);
    } catch (cause) {
      result.errors[id] = cause instanceof Error ? cause.message : "The thread could not be settled.";
    }
    onProgress(++processed);
  }
  return result;
}
