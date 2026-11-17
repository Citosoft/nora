import { ChevronDown, ChevronRight } from "lucide-react";
import type { SidebarSectionHeaderProps } from "@/components/app/types/changesPanelSections.types";

/** Quiet section heading used across the right sidebar: title, count, then trailing actions. */
export function SidebarSectionHeader({ title, count, actions, collapse }: SidebarSectionHeaderProps) {
  const label = <>
    <span className="truncate">{title}</span>
    {count !== undefined && <span className="text-[11px] font-normal tabular-nums text-muted-foreground">{count}</span>}
  </>;
  return <div className="flex min-h-8 items-center gap-2 px-4 pt-3">
    {collapse ? <button type="button" aria-expanded={!collapse.collapsed} onClick={collapse.onToggle}
      className="-ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-xs font-medium text-foreground/90 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {collapse.collapsed ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      {label}
    </button> : <h3 className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium text-foreground/90">{label}</h3>}
    {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
  </div>;
}
