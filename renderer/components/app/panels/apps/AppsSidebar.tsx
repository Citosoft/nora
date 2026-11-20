import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useAppBuildCleanup } from "@/components/app/hooks/useAppBuildCleanup";
import { canDiscardBuild } from "@/components/app/logic/apps/discardBuild";
import { APPS_SECTION_ICON } from "@/components/app/constants/appsSectionIcon";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { unfinishedAppBuilders } from "@/components/app/logic/apps/unfinishedBuilders";
import { useApps } from "@/components/app/hooks/useApps";
import { useNoraConnectors } from "@/components/app/hooks/useNoraConnectors";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { AppsSidebarProps } from "@/components/app/types/apps.types";
import { Tooltip } from "@/components/ui/tooltip";
import { AppConnectorLogos } from "./AppConnectorLogos";
import { AppIcon } from "./AppIcon";

/** Every app, newest first, with the logos of the connectors it uses; choosing one shows it in the center. */
export function AppsSidebar({ collapsed }: AppsSidebarProps) {
  const { apps, error } = useApps();
  const { connectors } = useNoraConnectors();
  const navigation = useWorkspaceNavigation();
  const { showHome, setThreadVisible } = useThreadNavigationPorts();
  const { state, store } = useThreadCenterPorts();
  const cleanup = useAppBuildCleanup(store);
  const builders = apps ? unfinishedAppBuilders(state.summaries, apps, state.boot.environmentId) : [];
  const openBuilder = (id: string): void => {
    navigation.closeTool();
    if (store.openThread(id)) setThreadVisible(true);
  };
  const select = (activeAppId: string): void => { navigation.closeTool(); navigation.setPreferences((current) => ({ ...current, activeAppId })); showHome(); };
  return <nav aria-label="Apps" className={`min-h-0 w-full flex-1 overflow-y-auto ${collapsed ? "px-1" : "px-3"}`}>
    {cleanup.error && <p role="alert" className="px-2 pb-2 text-xs text-destructive">{cleanup.error}</p>}
    {error && <p role="alert" className={collapsed ? "sr-only" : "px-2 pb-2 text-xs text-destructive"}>{error}</p>}
    {apps && !apps.length && <p className={collapsed ? "sr-only" : "px-2 py-2 text-xs text-muted-foreground"}>No apps yet. Describe one to build it.</p>}
    <ul className={collapsed ? "flex flex-col items-center gap-0.5" : "space-y-0.5"}>{(apps ?? []).map((app) => {
      const active = navigation.preferences.activeAppId === app.id;
      const button = <button type="button" aria-label={app.name} aria-current={active ? "page" : undefined} onClick={() => select(app.id)}
        className={`flex items-center rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${collapsed ? "size-8 justify-center" : "h-8 w-full gap-2 px-2 text-left"} ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
        <AppIcon icon={app.icon} />{!collapsed && <><span className="min-w-0 flex-1 truncate">{app.name}</span>
        <AppConnectorLogos connectorIds={app.connectorIds} connectors={connectors ?? []} /></>}</button>;
      return <li key={app.id}>{collapsed ? <Tooltip content={app.name} side="right">{button}</Tooltip> : button}</li>;
    })}</ul>
    {builders.length > 0 && <>
      <h2 className={collapsed ? "sr-only" : "px-2 pb-1 pt-4 text-xs font-medium text-muted-foreground"}>Unfinished builds</h2>
      <ul className={collapsed ? "mt-2 flex flex-col items-center gap-0.5" : "space-y-0.5"}>{builders.map((summary) => {
        const { conversation, queuedCount, pendingRequestCount } = summary;
        const discardable = canDiscardBuild(summary);
        const discarding = cleanup.discarding === conversation.id;
        const status = pendingRequestCount ? "Needs input" : conversation.queuePaused && queuedCount ? "Queue paused" : queuedCount ? "Queued" : "Open builder";
        const button = <button type="button" onClick={() => openBuilder(conversation.id)} aria-label={`${conversation.title} — ${status}`}
          className={`flex items-center rounded-md text-sm text-muted-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${collapsed ? "size-8 justify-center" : "min-w-0 flex-1 gap-2 px-2 py-1.5 text-left"}`}>
          <APPS_SECTION_ICON className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate">{conversation.title}</span><span className="block text-xs opacity-70">{status}</span></span>}
        </button>;
        return <li key={conversation.id}><ContextMenu><ContextMenuTrigger asChild>
          <div className="flex min-w-0 items-center">
            {collapsed ? <Tooltip content={`${conversation.title} — ${status}`} side="right">{button}</Tooltip> : button}
            {!collapsed && <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Discard build: ${conversation.title}`} tooltip={discardable ? "Discard build and clear queued messages" : "Stop this build before discarding it"}
              disabled={!discardable || cleanup.discarding !== null} onClick={() => void cleanup.discard(conversation.id)}>
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>}
            {discarding && <span className="sr-only" role="status">Discarding build</span>}
          </div>
        </ContextMenuTrigger><ContextMenuContent>
          <ContextMenuItem destructive disabled={!discardable || cleanup.discarding !== null} onSelect={() => void cleanup.discard(conversation.id)}>
            <Trash2 className="size-3.5" aria-hidden="true" />Discard build
          </ContextMenuItem>
        </ContextMenuContent></ContextMenu></li>;
      })}</ul>
    </>}
  </nav>;
}
