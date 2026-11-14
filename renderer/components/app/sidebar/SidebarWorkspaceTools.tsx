import { useState } from "react";
import { MoreHorizontal, Pin, PinOff } from "lucide-react";
import { isGitProject } from "@shared/projectVersionControl";
import { WORKSPACE_TOOLS } from "@/components/app/constants/workspaceTools";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { availableWorkspaceTools, DEFAULT_WORKSPACE_TOOL_PINS, toggleWorkspaceToolPin, workspaceToolPins } from "@/components/app/logic/workspace-navigation/tools";
import type { SidebarModeStripProps } from "@/components/app/types/botNavigation.types";
import type { WorkspaceToolId } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarIconButton } from "./SidebarIconButton";

export function SidebarWorkspaceTools({ edge }: SidebarModeStripProps) {
  const navigation = useWorkspaceNavigation();
  const project = useCanonicalAppSnapshot()?.project;
  const [open, setOpen] = useState(false);
  if (!project) return null;
  const available = availableWorkspaceTools(isGitProject(project));
  const tools = WORKSPACE_TOOLS.filter((tool) => available.includes(tool.id));
  const pins = workspaceToolPins(available, navigation.preferences.toolPins[project.id]);
  const active = navigation.route?.projectId === project.id ? navigation.route.tool : null;
  const select = (tool: WorkspaceToolId): void => { setOpen(false); navigation.openTool(project.id, tool); };
  const togglePin = (tool: WorkspaceToolId): void => navigation.setPreferences((current) => ({
    ...current,
    toolPins: { ...current.toolPins, [project.id]: toggleWorkspaceToolPin(current.toolPins[project.id] ?? DEFAULT_WORKSPACE_TOOL_PINS, tool) }
  }));
  const hiddenActive = active !== null && !pins.includes(active);
  return <>
    {pins.map((id) => {
      const tool = tools.find((entry) => entry.id === id);
      return tool ? <SidebarIconButton key={id} label={tool.label} icon={tool.icon} active={active === id} onSelect={() => select(id)} /> : null;
    })}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="More workspace tools" tooltip="More workspace tools"
          className={`size-9 shrink-0 ${hiddenActive ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side={edge === "left" ? "right" : "left"} align="start" className="max-h-[70vh] w-64 overflow-y-auto p-2" aria-label="Workspace tools">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Workspace tools</p>
        {tools.map(({ id, label, icon: Icon }) => {
          const pinned = pins.includes(id);
          const PinIcon = pinned ? PinOff : Pin;
          const pinLabel = `${pinned ? "Unpin" : "Pin"} ${label}`;
          return <div key={id} className={`flex items-center gap-1 rounded-md ${active === id ? "bg-secondary" : "hover:bg-muted"}`}>
            <Button type="button" variant="ghost" className="h-9 min-w-0 flex-1 justify-start px-2 text-sm font-normal" aria-label={`Open ${label}`} aria-pressed={active === id} onClick={() => select(id)}>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />{label}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={pinLabel} aria-pressed={pinned} tooltip={pinLabel} onClick={() => togglePin(id)}>
              <PinIcon className={`size-3.5 ${pinned ? "text-foreground" : "text-muted-foreground"}`} aria-hidden="true" />
            </Button>
          </div>;
        })}
        <p className="px-2 pb-1 pt-2 text-xs text-muted-foreground">Pin tools to keep them in this workspace’s sidebar.</p>
      </PopoverContent>
    </Popover>
  </>;
}
