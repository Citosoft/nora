import { parsePatchLines } from "@shared/conversations/diff";
import { cn } from "@/lib/utils";
import { diffRowClass, diffTextClass } from "@/components/app/logic/diffLineStyles";
import type { NativeDiffProps } from "@/components/app/types/nativeDiff.types";

export function NativeDiff({ patch }: NativeDiffProps) {
  return <pre aria-label="File diff" className="mt-2 max-h-96 overflow-auto rounded-md border bg-muted/20 py-2 font-mono text-xs">{parsePatchLines(patch).map((line, index) =>
    <span key={index} className={cn("block min-w-full w-max px-3", diffRowClass(line.kind), diffTextClass(line.kind))}>{line.text || " "}</span>
  )}</pre>;
}
