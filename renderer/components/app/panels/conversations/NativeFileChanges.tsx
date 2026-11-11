import { patchLineCounts, sumPatchLineCounts } from "@shared/conversations/diff";
import type { NativeFileChangesProps } from "@/components/app/types/nativeDiff.types";
import { DiffCounts } from "./DiffCounts";
import { NativeDiff } from "./NativeDiff";

export function NativeFileChanges({ item }: NativeFileChangesProps) {
  const patches = item.paths.map((path) => item.patches?.[path]);
  const partial = patches.some((patch) => patchLineCounts(patch) === null);
  return <details className="rounded-lg border bg-card/50 p-3 text-sm" aria-label="Reported file changes">
    <summary className="cursor-pointer"><span className="ml-1 inline-flex items-center gap-3">
      {item.paths.length} reported file {item.paths.length === 1 ? "change" : "changes"}<DiffCounts counts={sumPatchLineCounts(patches)} />
    </span></summary>
    <p className="my-2 text-xs text-muted-foreground">Provider-reported · {item.attribution} scope{partial ? " · Some line counts are unavailable." : ""}</p>
    <div className="space-y-2">{item.paths.map((path) => {
      const patch = item.patches?.[path];
      return <details key={path} className="rounded-md border p-2">
        <summary className="cursor-pointer"><span className="ml-1 inline-flex max-w-full items-center gap-3"><span className="break-all font-mono text-xs">{path}</span><DiffCounts counts={patchLineCounts(patch)} /></span></summary>
        {patch ? <NativeDiff patch={patch} /> : <p className="mt-2 text-xs text-muted-foreground">Diff unavailable.</p>}
      </details>;
    })}</div>
  </details>;
}
