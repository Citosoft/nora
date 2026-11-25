import { cn } from "@/lib/utils";
import { formatAgentMode } from "@/components/app/logic/utils";
import type { ThreadAccessBadgeProps } from "@/components/app/types/threadAccess.types";

/** Compact read/write access for the open thread's workspace checkout; optional toggle when the thread can change mode. */
export function ThreadAccessBadge({ access, className, disabled, onToggle }: ThreadAccessBadgeProps) {
  const label = formatAgentMode(access);
  const next = access === "read" ? "Writable" : "Read-only";
  const tone = access === "read"
    ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"
    : "border-border/70 text-muted-foreground";
  const title = onToggle
    ? `${label}. Click to switch to ${next}.`
    : access === "read"
      ? "This thread can inspect the workspace but not edit files."
      : "This thread can edit files in the workspace.";
  const classes = cn("shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", tone, className);
  if (!onToggle) {
    return <span className={classes} title={title} aria-label={`Workspace access: ${label}`}>{label}</span>;
  }
  return <button type="button" className={cn(classes, "transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60")}
    title={title} aria-label={`Workspace access: ${label}. Switch to ${next}.`} disabled={disabled} onClick={onToggle}>{label}</button>;
}
