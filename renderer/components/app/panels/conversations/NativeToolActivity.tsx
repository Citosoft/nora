import { Clock3, FileCode2, Globe, Image, LoaderCircle, Plug, Terminal, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NativeToolActivityProps } from "@/components/app/types/nativeActivity.types";
import { patchLineCounts } from "@shared/conversations/diff";
import { toolStateLabel } from "@/components/app/logic/toolStateLabel";
import { DiffCounts } from "./DiffCounts";
import { NativeDiff } from "./NativeDiff";

export function NativeToolActivity({ item }: NativeToolActivityProps) {
  const category = item.details?.category ?? "other";
  const Icon = category === "command" ? Terminal : category === "integration" ? Plug : category === "search" ? Globe
    : category === "file" ? FileCode2 : category === "image" ? Image : category === "agent" ? Users : Clock3;
  const running = item.state === "running";
  const failed = item.state === "failed";
  const status = toolStateLabel(item.state);
  return <details className="min-w-0 text-sm text-muted-foreground" aria-label={`${item.label}: ${status}`}>
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden" title={item.details?.input ?? item.label}>
      <span className={cn("shrink-0", running && "motion-safe:animate-spin")} aria-hidden="true">{running ? <LoaderCircle className="size-3.5" /> : <Icon className="size-3.5" />}</span>
      <span className={cn("min-w-0 flex-1 truncate", running && "text-shimmer")}>{item.label}{item.details?.input && <span className={cn("ml-1.5", running ? "text-shimmer" : "text-muted-foreground/80")}>{item.details.input.replace(/\s+/g, " ").trim()}</span>}</span>
      <DiffCounts counts={patchLineCounts(item.details?.patch)} />
      <span role="status" className={cn(item.state === "completed" ? "sr-only" : "shrink-0 text-xs", failed && "text-destructive")}>{status}</span>
    </summary>
    <div className="space-y-3 pb-3 pl-6 pt-2">
      {item.details?.parentId && <p className="text-xs text-muted-foreground">From a nested tool or background task</p>}
      {item.details?.detail && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{item.details.detail}</p>}
      {item.details?.patch && <NativeDiff patch={item.details.patch} />}
      {item.details?.input && <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">{category === "command" ? "Command" : "Input"}</p>
        <pre className="max-h-60 overflow-auto rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap break-words">{item.details.input}</pre></div>}
      <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Output</p>
        {item.output ? <pre className="max-h-80 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap break-words">{item.output}</pre>
          : <p className="text-xs text-muted-foreground">{running ? "Waiting for output…" : "No text output."}</p>}</div>
      {(item.details?.durationMs !== undefined || item.details?.exitCode !== undefined) && <p className="flex gap-3 text-xs text-muted-foreground">
        {item.details.durationMs !== undefined && <span>{(item.details.durationMs / 1000).toFixed(1)}s</span>}
        {item.details.exitCode !== undefined && <span>Exit code {item.details.exitCode}</span>}
      </p>}
    </div>
  </details>;
}
