import { CircleHelp, LoaderCircle } from "lucide-react";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskThreadIndicatorProps } from "@/components/app/types/taskThreads.types";

/** Shows that an agent is working on a task, with its provider, and opens that thread. */
export function TaskThreadIndicator({ thread, onOpenThread, variant = "compact" }: TaskThreadIndicatorProps) {
  const state = thread.waiting ? "Needs your attention" : "Working";
  const label = `${state}: open thread ${thread.title} (${thread.model})`;
  const StatusIcon = thread.waiting ? CircleHelp : LoaderCircle;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      tooltip={`${state} · ${thread.model} · Open thread`}
      onClick={(event) => {
        // Rows and cards open the task on click; this control opens the thread instead.
        event.stopPropagation();
        onOpenThread(thread.id);
      }}
      className={cn(
        "h-6 shrink-0 gap-1 rounded-full border px-1.5 text-[10px] font-normal",
        thread.waiting
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
          : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
      )}
    >
      <StatusIcon aria-hidden="true" className={cn("size-3", !thread.waiting && "motion-safe:animate-spin")} />
      <AgentToolIcon
        connection={thread.connection}
        toolId={thread.providerKind}
        label={thread.providerKind}
        className="size-4 bg-transparent"
        imageClassName="size-3.5"
      />
      {variant === "labelled" && <span className="max-w-32 truncate">{thread.model}</span>}
    </Button>
  );
}
