import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SessionPidBadgeProps = {
  pid: number;
  className?: string;
};

/**
 * PID labels are identifiers, not state — use a neutral, monospace treatment so they stay
 * readable on dark surfaces (avoid success/warning fills meant for status words).
 */
export function SessionPidBadge({ pid, className }: SessionPidBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border/70 bg-muted/50 font-mono text-[11px] tabular-nums font-medium leading-none text-foreground",
        "dark:border-border/90 dark:bg-muted/25 dark:text-foreground/95",
        className
      )}
    >
      PID {pid}
    </Badge>
  );
}
