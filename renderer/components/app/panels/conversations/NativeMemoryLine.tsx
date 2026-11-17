import { useState } from "react";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { rememberCallIsFresh } from "@/components/app/logic/rememberCalls";
import type { NativeMemoryLineProps } from "@/components/app/types/nativeActivity.types";

/** "Remembered": a brain and a line that draws across the thread when Nora or a bot saves a note, with the note beneath it. */
export function NativeMemoryLine({ call }: NativeMemoryLineProps) {
  const running = call.tool.state === "running";
  // Only saves that happen while the thread is open play the reveal; reopening a thread shows past notes still.
  const [reveal] = useState(() => running || rememberCallIsFresh(call, Date.now()));
  const label = running ? "Remembering…" : call.updated ? "Memory updated" : "Remembered";
  return <div role="status" aria-label={call.text ? `${label}: ${call.text}` : label} data-state={running ? "saving" : "saved"} data-reveal={reveal}
    className="memory-line text-sm">
    <div className="flex items-center gap-2">
      <span className="memory-line-icon flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Brain className="size-3.5" aria-hidden="true" />
      </span>
      <span className={cn("shrink-0 font-medium", running && "text-shimmer")}>{label}</span>
      {call.workspace && <span className="shrink-0 text-xs text-muted-foreground">· this workspace</span>}
      <span className="memory-line-track relative h-px min-w-6 flex-1 overflow-hidden rounded-full" aria-hidden="true" />
    </div>
    {call.text && <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words pl-8 text-muted-foreground" title={call.text}>{call.text}</p>}
  </div>;
}
