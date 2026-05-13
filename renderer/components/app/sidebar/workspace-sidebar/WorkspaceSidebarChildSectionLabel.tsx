import { cn } from "@/lib/utils";
import { WorkspaceSidebarSectionCountBadge } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarSectionCountBadge";
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
  const shouldShowCountBadge = typeof count === "number" && count > 0;
  const className = cn(
    "flex min-w-0 items-center gap-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground",
    onOpenCenter &&
      "rounded-[4px] px-1 py-0.5 -mx-1 transition hover:bg-accent/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  );

  if (onOpenCenter) {
    return (
      <button
        type="button"
        onClick={onOpenCenter}
        className={cn(className, "text-left")}
        aria-label={openCenterAriaLabel ?? `Open ${label} center`}
      >
        <span className="relative shrink-0">
          {icon}
          {shouldShowCountBadge ? <WorkspaceSidebarSectionCountBadge count={count} /> : null}
        </span>
        <span className="truncate">{label}</span>
      </button>
    );
  }

  return (
    <div className={className}>
      <span className="relative shrink-0">
        {icon}
        {shouldShowCountBadge ? <WorkspaceSidebarSectionCountBadge count={count} /> : null}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
};
