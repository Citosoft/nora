import { Settings } from "lucide-react";
import { THREAD_INSIGHTS_SECTIONS } from "@/components/app/constants/threadInsightsSections";
import type { ThreadInsightsSectionsMenuProps } from "@/components/app/types/threadInsights.types";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

/** Cog in the thread details header: the same section toggles as the panel's right-click menu. */
export function ThreadInsightsSectionsDropdown({ visibility }: ThreadInsightsSectionsMenuProps) {
  return <DropdownMenu align="end" trigger={<button type="button" className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    aria-label="Choose thread details sections" aria-haspopup="menu" title="Choose sections"><Settings className="size-3.5" aria-hidden="true" /></button>}>
    <div role="menu" aria-label="Thread details sections">
      <DropdownMenuLabel>Show sections</DropdownMenuLabel>
      {THREAD_INSIGHTS_SECTIONS.map((section) => <DropdownMenuCheckboxItem key={section.id} checked={visibility.isVisible(section.id)} onCheckedChange={() => visibility.toggle(section.id)}>{section.label}</DropdownMenuCheckboxItem>)}
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={visibility.hidden.size === 0} onSelect={visibility.showAll}>Show all sections</DropdownMenuItem>
    </div>
  </DropdownMenu>;
}
