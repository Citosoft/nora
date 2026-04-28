import type { AiChatToolActivityGroupProps } from "@/components/app/types/aiChatToolActivityGroup.types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export const AiChatToolActivityGroup = ({ messageId, entries }: AiChatToolActivityGroupProps) => {
  const runningCount = entries.filter((entry) => entry.status === "running").length;
  const errorCount = entries.filter((entry) => entry.status === "error").length;
  const completedCount = entries.filter((entry) => entry.status === "done" || entry.status === "info").length;

  if (entries.length === 0) {
    return null;
  }

  const summaryLabel =
    errorCount > 0
      ? `${errorCount} failed`
      : runningCount > 0
        ? `${runningCount} running`
        : `${completedCount} completed`;

  return (
    <div className="mt-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-background/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
            aria-label={`Show tool activity for message ${messageId}`}
          >
            <span className="font-medium text-foreground/90">Tool activity</span>
            <span className="rounded-full border border-border/65 bg-background/80 px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
              {entries.length}
            </span>
            <span
              className={cn(
                "text-[10px]",
                errorCount > 0 ? "text-destructive" : runningCount > 0 ? "text-primary" : "text-muted-foreground"
              )}
            >
              {summaryLabel}
            </span>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-[min(30rem,calc(100vw-3rem))]">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">Tool activity</span>
            <span className="text-muted-foreground">{summaryLabel}</span>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {entries.map((entry, index) => (
              <div
                key={`${entry.id}-${index}`}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs leading-5",
                  entry.status === "error"
                    ? "border-destructive/45 bg-destructive/8 text-destructive"
                    : entry.status === "running"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/55 bg-background/50 text-muted-foreground"
                )}
                role="status"
                aria-live={entry.status === "running" ? "polite" : "off"}
              >
                <span className="font-medium text-foreground/90">{entry.label}</span>
                {entry.detail ? <span className="ml-1">{entry.detail}</span> : null}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
