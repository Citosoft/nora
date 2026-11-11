import { Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useWorkspaceSessionPanelActions, useWorkspaceSessionPanelData } from "@/components/app/context/workspaceSessionPanelContext";
import { useWorkspaceView } from "@/components/app/hooks/useWorkspaceView";
import { BrowserTabPanel } from "@/components/app/panels/BrowserTabPanel";
import { SessionTabPane, SessionTabStack } from "@/components/app/panels/SessionTabStack";
import type { WorkspaceSurfaceProps } from "@/components/app/types/workspaceToolSurfaces.types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspacePortsMenu } from "./WorkspacePortsMenu";

export function WorkspaceBrowserTool({ workspace, active }: WorkspaceSurfaceProps) {
  const data = useWorkspaceSessionPanelData();
  const actions = useWorkspaceSessionPanelActions();
  const projectId = workspace.project.id;
  const { view, updateView } = useWorkspaceView(projectId);
  const requestedInitial = useRef(false);
  const tabs = data.browserTabs.filter((tab) => tab.projectId === projectId);
  const focused = active && data.browserTab?.projectId === projectId ? data.browserTab : null;
  const selected = focused ?? tabs.find((tab) => tab.id === view.browserTabId) ?? tabs.at(-1);
  useEffect(() => {
    if (!active || tabs.length || requestedInitial.current) return;
    requestedInitial.current = true;
    actions.onOpenWorkspaceBrowser(projectId);
  }, [active, tabs.length, projectId, actions.onOpenWorkspaceBrowser]);
  useEffect(() => {
    if (selected && selected.id !== view.browserTabId) updateView({ browserTabId: selected.id });
  }, [selected?.id, view.browserTabId, updateView]);
  return <Tabs value={selected?.id ?? ""} onValueChange={(id) => { updateView({ browserTabId: id }); actions.onFocusBrowserTab(id); }} className="flex h-full min-h-0 flex-col gap-0">
    <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-1.5">
      <TabsList aria-label="Workspace browser tabs" className="min-w-0 flex-1 justify-start gap-1 overflow-x-auto border-0 bg-transparent p-0">
        {tabs.map((tab) => <div key={tab.id} className={`flex shrink-0 items-center rounded-md ${selected?.id === tab.id ? "bg-secondary" : "hover:bg-muted"}`}>
          <TabsTrigger value={tab.id} className="max-w-48 truncate rounded-md px-3 py-2 text-xs">{tab.title}</TabsTrigger>
          <Button variant="ghost" size="icon" className="mr-1 size-6" aria-label={`Close browser tab ${tab.title}`} onClick={() => actions.onCloseBrowserTab(tab.id)}><X className="size-3" aria-hidden="true" /></Button>
        </div>)}
      </TabsList>
      <WorkspacePortsMenu projectId={projectId} />
      <Button variant="ghost" size="icon" className="size-8" aria-label="New browser tab" onClick={() => actions.onOpenWorkspaceBrowser(projectId, "about:blank")}><Plus className="size-4" aria-hidden="true" /></Button>
    </div>
    <SessionTabStack>{tabs.map((tab) => <SessionTabPane key={tab.id} visible={selected?.id === tab.id}><BrowserTabPanel tab={tab} /></SessionTabPane>)}
      {!tabs.length && <div className="flex flex-1 items-center justify-center"><Button onClick={() => actions.onOpenWorkspaceBrowser(projectId, "about:blank")}>Open browser tab</Button></div>}
    </SessionTabStack>
  </Tabs>;
}
