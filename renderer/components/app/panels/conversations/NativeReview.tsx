import type { NativeReviewProps } from "@/components/app/types/nativePanels.types";
import { TurnChangesCard } from "./TurnChangesCard";

export function NativeReview({ item, undo }: NativeReviewProps) {
  const { result } = item;
  if (result.status === "unavailable") return result.reason === "unsupported" ? null : <p className="text-sm text-muted-foreground">Review unavailable: {result.reason.replaceAll("-", " ")}.</p>;
  if (result.scope === "workspace") return <details className="rounded-lg border p-3 text-sm"><summary>Workspace changes — turn attribution unavailable</summary>
    <p className="my-2 text-muted-foreground">This observation can include changes made outside this turn.</p>
    <ul>{result.paths.map((path) => <li key={path}>{path}</li>)}</ul>{!result.paths.length && <p>No workspace changes observed.</p>}</details>;
  return <TurnChangesCard review={result} undo={undo ? { availability: undo.availability(item.id), state: item.undo, onUndo: (mode) => undo.undo(item.runId, mode) } : null} />;
}
