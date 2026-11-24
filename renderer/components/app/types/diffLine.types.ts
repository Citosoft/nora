import type { DiffLine } from "@shared/types/conversation/diff.types";

/** How a unified-diff line is drawn; hunk headers are split out of metadata so viewers can show them as section breaks. */
export type DiffLineTone = DiffLine["kind"] | "hunk";

/** A unified-diff line with its position in the old and new file; null where the line does not exist on that side. */
export interface ParsedDiffLine {
  key: string;
  text: string;
  tone: DiffLineTone;
  oldLine: number | null;
  newLine: number | null;
}

export interface FilePathLabelProps {
  path: string;
  className?: string;
}

export interface ChangeStatusBadgeProps {
  status: string;
}

export interface DiffLineLimit {
  limit: number;
  showMore(total: number): void;
  showAll(total: number): void;
}
