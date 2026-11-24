import { FileDiff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UnpreviewedChangeProps } from "@/components/app/types/nativeDiff.types";

/** Explains why a turn change has no inline patch and, for oversized text diffs, links to the full-diff viewer. */
export function UnpreviewedChange({ change, onOpenFileDiff }: UnpreviewedChangeProps) {
  if (change.presentation === "binary") return <p className="text-xs text-muted-foreground">Binary file changed.</p>;
  return <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">Patch exceeds the preview limit.
    {onOpenFileDiff && <Button type="button" variant="ghost" className="h-auto gap-1 p-0 text-xs text-foreground underline-offset-2 hover:bg-transparent hover:underline" aria-label={`Open ${change.path} in the full diff viewer`}
      onClick={() => onOpenFileDiff(change.path)}><FileDiff className="size-3.5" aria-hidden="true" />Open in diff viewer</Button>}
  </p>;
}
