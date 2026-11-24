import { useRef, useState } from "react";
import { canBulkSettleThread, DEFAULT_SETTLEMENT_AGE, preselectSettlements, settleThreadBatch } from "@/components/app/logic/thread-workspace/bulkSettlement";
import type { BulkSettleDialogProps, BulkSettlementProgress } from "@/components/app/types/thread-workspace/bulkSettlement.types";

export function useBulkSettlement({ rows, onSettle, onClose }: Omit<BulkSettleDialogProps, "workspaces">) {
  const [now] = useState(Date.now);
  const [days, setDays] = useState<number>(DEFAULT_SETTLEMENT_AGE);
  const [selected, setSelected] = useState(() => preselectSettlements(rows, days, now));
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<BulkSettlementProgress | null>(null);
  const running = useRef(false);
  const latestRows = useRef(rows);
  latestRows.current = rows;
  const candidates = rows.filter((row) => !row.settled && row.target.kind !== "draft" && !completed.has(row.id));
  const eligible = candidates.filter(canBulkSettleThread);
  const chosen = eligible.filter((row) => selected.has(row.id));
  const changeAge = (age: number) => {
    setDays(age);
    setSelected(preselectSettlements(candidates, age, now));
  };
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  const submit = async () => {
    if (running.current || !chosen.length) return;
    running.current = true;
    const ids = chosen.map((row) => row.id);
    setProgress({ processed: 0, total: ids.length });
    setErrors({});
    try {
      const result = await settleThreadBatch({ ids, findRow: (id) => latestRows.current.find((row) => row.id === id), settle: onSettle,
        onProgress: (processed) => setProgress({ processed, total: ids.length }) });
      setCompleted((current) => new Set([...current, ...result.completed]));
      setErrors(result.errors);
      setSelected(new Set(Object.keys(result.errors)));
      if (!Object.keys(result.errors).length) onClose();
    } finally {
      running.current = false;
      setProgress(null);
    }
  };
  return { now, days, changeAge, candidates, selected, chosen, errors, progress, toggle, submit,
    selectAll: () => setSelected(new Set(eligible.map((row) => row.id))), clear: () => setSelected(new Set()) };
}
