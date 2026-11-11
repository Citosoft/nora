import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { useState } from "react";
import { MoreHorizontal, Pin } from "lucide-react";
import { WORKSPACE_TOOLS } from "@/components/app/constants/workspaceTools";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { availableWorkspaceTools, toggleWorkspaceToolPin, workspaceToolPins } from "@/components/app/logic/workspace-navigation/tools";
import type { WorkspaceShortcutsProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isGitProject } from "@shared/projectVersionControl";

export function WorkspaceShortcuts({ workspace, role, collapsed }: WorkspaceShortcutsProps) {
  const actions = useWorkspaceSidebarActions();
  const navigation = useWorkspaceNavigation();
  const [open, setOpen] = useState(false);
  const available = availableWorkspaceTools(isGitProject(workspace.project));
  const pins = workspaceToolPins(role, available, navigation.preferences.toolPins[workspace.project.id]);
  const active = navigation.route?.projectId === workspace.project.id ? navigation.route.tool : null;
  const select = (tool: Parameters<typeof navigation.openTool>[1]) => { setOpen(false); if (tool === "browser") { navigation.closeTool(); actions.onOpenWorkspaceBrowser(workspace.project.id); } else navigation.openTool(workspace.project.id, tool); };
  return <nav aria-label="Workspace shortcuts" className={`flex gap-1 ${collapsed ? "flex-col items-center px-1 py-2" : "flex-wrap px-3 pb-4"}`}>
    {pins.map((id) => {
      const tool = WORKSPACE_TOOLS.find((entry) => entry.id === id);
      if (!tool) return null;
      const Icon = tool.icon;
      return <Button key={id} variant={active === id ? "secondary" : "ghost"} size={collapsed ? "icon" : "sm"} className={collapsed ? "size-8" : "h-8 gap-1.5 px-2 text-xs font-normal"} aria-label={`Open workspace ${tool.label.toLowerCase()}`} aria-pressed={active === id} tooltip={collapsed ? tool.label : undefined} onClick={() => select(id)}><Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />{!collapsed && tool.label}</Button>;
    })}
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="More workspace tools" tooltip="More tools"><MoreHorizontal className="size-4" aria-hidden="true" /></Button></PopoverTrigger>
      <PopoverContent side={collapsed ? "right" : "bottom"} align="start" className="w-64 p-2" aria-label="Workspace tools and pins">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Workspace tools</p>
        {WORKSPACE_TOOLS.filter((tool) => available.includes(tool.id)).map(({ id, label, icon: Icon }) => <div key={id} className="flex items-center rounded-md hover:bg-muted">
          <button type="button" onClick={() => select(id)} className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icon className="size-4 text-muted-foreground" aria-hidden="true" />{label}</button>
          <Button variant="ghost" size="icon" className="size-7" aria-label={`${pins.includes(id) ? "Unpin" : "Pin"} ${label}`} aria-pressed={pins.includes(id)} onClick={() => navigation.setPreferences((current) => ({ ...current, toolPins: { ...current.toolPins, [workspace.project.id]: toggleWorkspaceToolPin(current.toolPins[workspace.project.id] ?? workspaceToolPins(role, available), id) } }))}><Pin className={`size-3 ${pins.includes(id) ? "fill-current" : "text-muted-foreground"}`} aria-hidden="true" /></Button>
        </div>)}
        {Object.hasOwn(navigation.preferences.toolPins, workspace.project.id) && <Button variant="ghost" className="mt-2 h-8 w-full justify-start px-2 text-xs text-muted-foreground" onClick={() => navigation.setPreferences((current) => {
          const toolPins = { ...current.toolPins }; delete toolPins[workspace.project.id]; return { ...current, toolPins };
        })}>Use role defaults</Button>}
      </PopoverContent>
    </Popover>
  </nav>;
}
