import type { WorkspaceHomeHeadingProps } from "@/components/app/types/workspace-home/home.types";
import { cn } from "@/lib/utils";

/** The home's section label: small tracked capitals with a pixel count badge. */
export function WorkspaceHomeHeading({ id, children, count, tone, action }: WorkspaceHomeHeadingProps) {
  return <div className="mb-2 flex min-h-6 items-center justify-between gap-2">
    <h2 id={id} className={cn("flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em]", tone === "attention" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
      {tone === "attention" && <span aria-hidden="true" className="size-1.5 rounded-[1px] bg-current motion-safe:animate-pulse" />}
      {children}
      {count !== undefined && <span className={cn("grid h-4 min-w-4 place-items-center rounded-[3px] px-1 text-[9px] font-medium tabular-nums tracking-normal",
        tone === "attention" ? "bg-amber-500/15" : "bg-muted text-muted-foreground")}>{count}</span>}
    </h2>
    {action}
  </div>;
}
