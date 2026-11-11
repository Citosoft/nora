import { parsePatchLines } from "@shared/conversations/diff";
import { cn } from "@/lib/utils";
import type { NativeDiffProps } from "@/components/app/types/nativeDiff.types";

export function NativeDiff({ patch }: NativeDiffProps) {
  return <pre aria-label="File diff" className="mt-2 max-h-96 overflow-auto rounded-md border bg-muted/20 py-2 font-mono text-xs">{parsePatchLines(patch).map((line, index) =>
    <span key={index} className={cn("block min-w-full w-max px-3", line.kind === "addition" ? "bg-green-500/10 text-green-700 dark:text-green-400"
      : line.kind === "deletion" ? "bg-red-500/10 text-red-600 dark:text-red-400" : line.kind === "metadata" ? "text-muted-foreground" : "text-foreground")}>{line.text || " "}</span>
  )}</pre>;
}
