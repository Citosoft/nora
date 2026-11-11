import { useWorkspaceWorkflowActivity } from "@/components/app/hooks/useWorkspaceWorkflowActivity";
import { workspaceActivity } from "@/components/app/logic/workspace-navigation/activity";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Folder, Pin, Plus, Search } from "lucide-react";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import type { WorkspaceSwitcherProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WorkspaceAvatar } from "@/components/app/shared/WorkspaceAvatar";
import { WorkspaceColorPicker } from "./WorkspaceColorPicker";

export function WorkspaceSwitcher({ workspaces, activeId, collapsed, recentWorkspaces, onSelect, onOpenRecent, onAdd }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { state } = useThreadNavigationPorts();
  const { preferences, setPreferences } = useWorkspaceNavigation();
  const rows = useMemo(() => buildThreadNavigation(state, null, "all"), [state]);
  const workflowRuns = useWorkspaceWorkflowActivity(workspaces.map((entry) => entry.project.id));
  const active = workspaces.find((entry) => entry.project.id === activeId);
  const matches = (name: string, rootPath: string) => `${name} ${rootPath}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const visible = workspaces.filter((entry) => matches(entry.project.name, entry.project.rootPath))
    .sort((a, b) => Number(preferences.pinnedWorkspaceIds.includes(b.project.id)) - Number(preferences.pinnedWorkspaceIds.includes(a.project.id)));
  const recent = recentWorkspaces.filter((entry) => !workspaces.some((workspace) => workspace.project.rootPath === entry.rootPath) && matches(entry.name, entry.rootPath)).slice(0, 8);
  const additionalWorkspaces = state.boot.workspaces.filter((entry) =>
    !workspaces.some((workspace) => workspace.project.id === entry.shellProjectId) && matches(entry.name, entry.workspace.path ?? ""));
  const choose = (action: () => void) => { setOpen(false); setQuery(""); action(); };
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="ghost" size={collapsed ? "icon" : "default"} className={collapsed ? "size-9" : "h-11 min-w-0 flex-1 justify-start px-2 text-sm"} aria-label="Switch workspace" tooltip={collapsed ? active?.project.name ?? "Workspaces" : undefined}>
      {active ? <WorkspaceAvatar workspace={active.project} /> : <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      {!collapsed && <><span className="min-w-0 flex-1 truncate text-left">{active?.project.name ?? "Choose workspace"}</span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /></>}
    </Button></PopoverTrigger>
    <PopoverContent side={collapsed ? "right" : "bottom"} align="start" className="w-80 p-2" aria-label="Workspaces">
      <div className="relative mb-2"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a workspace…" aria-label="Search workspaces" className="h-9 pl-8" /></div>
      <div className="max-h-[55vh] space-y-1 overflow-y-auto">
        {visible.map((entry) => {
          const nativeId = state.boot.workspaces.find((workspace) => workspace.shellProjectId === entry.project.id)?.id;
          const { attention, running } = workspaceActivity(entry.project.id, nativeId, rows, entry.terminals, workflowRuns);
          const pinned = preferences.pinnedWorkspaceIds.includes(entry.project.id);
          return <div key={entry.project.id} className={`flex items-center rounded-md ${entry.project.id === activeId ? "bg-secondary" : "hover:bg-muted"}`}>
            <WorkspaceColorPicker workspace={entry.project} />
            <button type="button" onClick={() => choose(() => onSelect(entry.project.id))} aria-current={entry.project.id === activeId ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="min-w-0 flex-1"><span className="block truncate text-sm">{entry.project.name}</span><span className="block truncate text-[11px] text-muted-foreground">{attention ? `${attention} need attention` : running ? `${running} running` : entry.project.rootPath}</span></span>
              {entry.project.id === activeId && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
            </button>
            <Button variant="ghost" size="icon" className="mr-1 size-7 shrink-0" aria-label={`${pinned ? "Unpin" : "Pin"} workspace ${entry.project.name}`} aria-pressed={pinned} onClick={() => setPreferences((current) => ({ ...current, pinnedWorkspaceIds: pinned ? current.pinnedWorkspaceIds.filter((id) => id !== entry.project.id) : [...current.pinnedWorkspaceIds, entry.project.id] }))}><Pin className={`size-3 ${pinned ? "fill-current" : "text-muted-foreground"}`} aria-hidden="true" /></Button>
          </div>;
        })}
        {additionalWorkspaces.map((entry) => <div key={entry.id} className="flex items-center rounded-md hover:bg-muted">
          <WorkspaceColorPicker workspace={{ id: entry.shellProjectId ?? entry.id, name: entry.name }} />
          <span className="min-w-0 flex-1 truncate px-2 py-2 text-sm">{entry.name}</span>
        </div>)}
        {!!recent.length && <p className="px-2 pb-1 pt-3 text-[11px] text-muted-foreground">Recent workspaces</p>}
        {recent.map((entry) => <button type="button" key={entry.rootPath} onClick={() => choose(() => onOpenRecent(entry.rootPath, entry.name))} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><WorkspaceAvatar workspace={{ id: entry.rootPath, name: entry.name }} /><span className="min-w-0 flex-1"><span className="block truncate text-sm">{entry.name}</span><span className="block truncate text-[11px] text-muted-foreground">{entry.rootPath}</span></span></button>)}
        {!visible.length && !recent.length && !additionalWorkspaces.length && <p className="px-2 py-4 text-xs text-muted-foreground">No matching workspaces.</p>}
      </div>
      <Button variant="ghost" className="mt-2 h-9 w-full justify-start text-xs" onClick={() => choose(onAdd)}><Plus className="size-4" aria-hidden="true" />Add workspace</Button>
    </PopoverContent>
  </Popover>;
}
