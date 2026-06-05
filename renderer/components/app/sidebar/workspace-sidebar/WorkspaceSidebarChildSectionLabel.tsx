import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type WorkspaceSidebarChildSectionLabelProps = {
  icon: ReactNode;
  label: string;
  count?: number;
  /** When set, the label is a button that opens the corresponding center (task / spec / note). */
  onOpenCenter?: () => void;
  openCenterAriaLabel?: string;
};

export const WorkspaceSidebarChildSectionLabel = ({
  icon,
  label,
  count,
  onOpenCenter,
  openCenterAriaLabel
}: WorkspaceSidebarChildSectionLabelProps) => {
  const shouldShowCount = typeof count === "number" && count > 0;
  const className = cn(
    "flex min-w-0 items-center gap-3.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
    onOpenCenter &&
      "rounded-[4px] px-1 py-0.5 -mx-1 transition hover:bg-accent/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  );
  const labelContent = (
    <>
      <span className="shrink-0 [&_svg]:size-3">{icon}</span>
      <span className="flex min-w-0 items-baseline gap-1">
        <span className="truncate">{label}</span>
        {shouldShowCount ? (
          <span className="shrink-0 text-[10px] font-normal tabular-nums opacity-75">({count})</span>
        ) : null}
      </span>
    </>
  );

  if (onOpenCenter) {
    return (
      <button
        type="button"
        onClick={onOpenCenter}
        className={cn(className, "text-left")}
        aria-label={openCenterAriaLabel ?? `Open ${label} center`}
      >
        {labelContent}
      </button>
    );
  }

  return <div className={className}>{labelContent}</div>;
};
