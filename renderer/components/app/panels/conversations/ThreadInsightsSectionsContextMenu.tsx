import { THREAD_INSIGHTS_SECTIONS } from "@/components/app/constants/threadInsightsSections";
import type { ThreadInsightsSectionsContextMenuProps } from "@/components/app/types/threadInsights.types";
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";

/** Right-clicking anywhere on the thread details panel lists its sections to show or hide. */
export function ThreadInsightsSectionsContextMenu({ visibility, children }: ThreadInsightsSectionsContextMenuProps) {
  return <ContextMenu>
    <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuLabel>Show sections</ContextMenuLabel>
      {THREAD_INSIGHTS_SECTIONS.map((section) => <ContextMenuCheckboxItem key={section.id} checked={visibility.isVisible(section.id)} onCheckedChange={() => visibility.toggle(section.id)}>{section.label}</ContextMenuCheckboxItem>)}
      <ContextMenuSeparator />
      <ContextMenuItem disabled={visibility.hidden.size === 0} onSelect={visibility.showAll}>Show all sections</ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>;
}
