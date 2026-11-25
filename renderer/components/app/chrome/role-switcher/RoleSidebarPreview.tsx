import { defaultWorkspaceToolPins, workspaceToolItems } from "@/components/app/logic/workspace-navigation/tools";
import type { RoleSidebarPreviewProps } from "@/components/app/types/windowChrome.types";

/** A miniature of the sidebar rail showing the tools a role pins; keyed by role so the pins drop in afresh on each preview. */
export function RoleSidebarPreview({ role }: RoleSidebarPreviewProps) {
  const tools = workspaceToolItems(defaultWorkspaceToolPins(role));
  return <div className="pixel-dots relative flex w-11 shrink-0 flex-col items-center gap-1.5 border-r border-border/60 bg-muted/30 py-3"
    role="img" aria-label={`Sidebar pins: ${tools.map((tool) => tool.label).join(", ")}`}>
    {tools.map(({ id, label, icon: Icon }, index) => <span key={`${role ?? "none"}:${id}`} title={label}
      className="pixel-pop-in grid size-7 place-items-center rounded-md border border-border/60 bg-popover text-muted-foreground shadow-sm"
      style={{ animationDelay: `${index * 45}ms` }}>
      <Icon className="size-3.5" aria-hidden="true" />
    </span>)}
  </div>;
}
