import type { DiffLineCounts } from "@shared/types/conversation/diff.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { TurnChange, TurnReview } from "@shared/types/conversation/review.types";

export interface DiffCountsProps { counts: DiffLineCounts | null; }
export interface NativeDiffProps { patch: string; }
export interface NativeFileChangesProps { item: Extract<TimelineItem, { kind: "changes" }>; }
export interface TurnChangesCardProps { review: TurnReview; }
export interface UnpreviewedChangeProps {
  change: TurnChange;
  /** Absent outside the signed-in shell, where there is no full-diff viewer to open. */
  onOpenFileDiff: ((path: string) => void) | null;
}
