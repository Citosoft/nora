import type { NativeReviewProps } from "@/components/app/types/nativePanels.types";

export function NativeReview({ result }: NativeReviewProps) {
  if (result.status === "unavailable") return <p className="text-sm text-muted-foreground">Review unavailable: {result.reason === "unsupported" ? "this workspace does not support Git review" : result.reason.replaceAll("-", " ")}.</p>;
  if (result.scope === "workspace") return <details className="rounded-lg border p-3 text-sm"><summary>Workspace changes — turn attribution unavailable</summary>
    <p className="my-2 text-muted-foreground">This observation can include changes made outside this turn.</p>
    <ul>{result.paths.map((path) => <li key={path}>{path}</li>)}</ul>{!result.paths.length && <p>No workspace changes observed.</p>}</details>;
  return <details className="rounded-lg border p-3 text-sm"><summary>{result.changes.length} changes observed during this turn</summary>
    <p className="my-2 text-muted-foreground">Observed between checkpoints; this does not prove authorship or successful validation.</p>
    {result.changes.map((change) => <details key={change.path} className="mt-2"><summary>{change.kind} · {change.path}</summary>
      {change.patch ? <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs">{change.patch}</pre>
        : <p className="text-muted-foreground">{change.presentation === "binary" ? "Binary file changed." : "Patch exceeds the preview limit."}</p>}</details>)}</details>;
}
