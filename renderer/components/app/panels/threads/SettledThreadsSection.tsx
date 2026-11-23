import { SidebarSectionHeader } from "@/components/app/panels/changes-panel/SidebarSectionHeader";
import type { SettledThreadsSectionProps } from "@/components/app/types/thread-workspace/navigation.types";

/** Keeps settled threads one click away without mixing them into the working list above. */
export function SettledThreadsSection({ rows, expanded, onExpandedChange, renderRow }: SettledThreadsSectionProps) {
  if (!rows.length) return null;
  return <div role="group" aria-label="Settled threads" className="shrink-0 border-t border-border/60 pb-2">
    <SidebarSectionHeader title="Settled" count={rows.length} collapse={{ collapsed: !expanded, onToggle: () => onExpandedChange(!expanded) }} />
    {expanded && <div className="max-h-[40vh] space-y-0.5 overflow-y-auto px-3 pt-1">{rows.map(renderRow)}</div>}
  </div>;
}
