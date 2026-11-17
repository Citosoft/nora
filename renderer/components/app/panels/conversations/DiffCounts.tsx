import type { DiffCountsProps } from "@/components/app/types/nativeDiff.types";

export function DiffCounts({ counts }: DiffCountsProps) {
  return counts ? <span className="inline-flex shrink-0 gap-2 font-mono text-xs tabular-nums" aria-label={`${counts.additions} additions, ${counts.deletions} deletions`}>
    <span className="text-green-700 dark:text-green-400">+{counts.additions}</span>
    <span className="text-red-600 dark:text-red-400">−{counts.deletions}</span>
  </span> : null;
}
