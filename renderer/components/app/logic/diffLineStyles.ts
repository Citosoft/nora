import type { DiffLineTone } from "@/components/app/types/diffLine.types";

const ROW: Record<DiffLineTone, string> = {
  addition: "bg-green-500/10",
  deletion: "bg-red-500/10",
  hunk: "bg-muted/50 text-muted-foreground",
  context: "",
  metadata: "text-muted-foreground"
};

const GUTTER: Record<DiffLineTone, string> = {
  addition: "bg-green-500/15 text-green-700/70 dark:text-green-400/70",
  deletion: "bg-red-500/15 text-red-600/70 dark:text-red-400/70",
  hunk: "",
  context: "text-muted-foreground/60",
  metadata: "text-muted-foreground/60"
};

const TEXT: Record<DiffLineTone, string> = {
  addition: "text-green-700 dark:text-green-400",
  deletion: "text-red-600 dark:text-red-400",
  hunk: "text-muted-foreground",
  context: "text-foreground",
  metadata: "text-muted-foreground"
};

/** Row background shared by every diff surface so additions and deletions read the same everywhere. */
export const diffRowClass = (tone: DiffLineTone): string => ROW[tone];
/** Line-number gutter, tinted a step stronger than the row. */
export const diffGutterClass = (tone: DiffLineTone): string => GUTTER[tone];
/** Text colour for the +/- marker, or for whole lines where no syntax highlighting applies. */
export const diffTextClass = (tone: DiffLineTone): string => TEXT[tone];
