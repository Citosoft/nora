import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import { SHORTCUT_DEFINITIONS, formatShortcutKeys } from "@/components/app/logic/keyboardShortcuts";
import { getWorkspaceSessionTabsToClose } from "@/components/app/logic/workspaceSessionTabContextActions";
import { BusyIndicator } from "@/components/app/shared/BusyIndicator";
import { useSessionTabOverflow } from "@/components/app/hooks/useSessionTabOverflow";
import { WorkspaceSessionTabIcon } from "@/components/app/panels/WorkspaceSessionTabIcon";
import { WorkspaceSessionTabOverflow } from "@/components/app/panels/WorkspaceSessionTabOverflow";
import { SESSION_TAB_WIDTH } from "@/components/app/logic/sessionTabOverflow";
import type { WorkspaceSessionTabsProps } from "@/components/app/types/component.types";
import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Globe, MessageSquare, Plus, TerminalSquare, X } from "lucide-react";
import { useEffect, useState } from "react";

function runCloseAction(targets: WorkspaceSessionTab[], onCloseMany: (tabs: WorkspaceSessionTab[]) => void) {
  if (!targets.length) {
    return;
  }
  onCloseMany(targets);
}

export function WorkspaceSessionTabs({
  tabs,
  activeTabId,
  platform,
  onSelect,
  onClose,
  onCloseMany,
  onCreateThread,
  onCreateTerminalFromDefaults,
  onCreateTerminal,
  onCreateBrowser,
}: WorkspaceSessionTabsProps) {
  const { containerRef, visibleTabs, overflowTabs } = useSessionTabOverflow(tabs, activeTabId);
  const [now, setNow] = useState(() => Date.now());
  const newAgentShortcut = formatShortcutKeys(
    SHORTCUT_DEFINITIONS.find((definition) => definition.id === "open-create-agent")?.keys ?? [],
    platform
  );
  const newTerminalShortcut = formatShortcutKeys(
    SHORTCUT_DEFINITIONS.find((definition) => definition.id === "open-create-terminal")?.keys ?? [],
    platform
  );
  const newBrowserShortcut = formatShortcutKeys(
    SHORTCUT_DEFINITIONS.find((definition) => definition.id === "open-workspace-browser")?.keys ?? [],
    platform
  );
  const closeTabShortcut = formatShortcutKeys(
    SHORTCUT_DEFINITIONS.find((definition) => definition.id === "close-active-session-tab")?.keys ?? [],
    platform
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div ref={containerRef} className="workspace-shell-surface min-w-0 shrink-0 overflow-hidden border-b border-border/60 bg-background/70">
      <div className="flex min-h-[46px] min-w-0 items-center gap-1 px-3 py-1.5">
        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isBusyAgent = tab.kind === "agent" && isAgentBusyAt(tab, now);
          const closeTabTargets = getWorkspaceSessionTabsToClose(tabs, tab, "close");
          const closeOtherTabTargets = getWorkspaceSessionTabsToClose(tabs, tab, "close-others");
          const closeRightTabTargets = getWorkspaceSessionTabsToClose(tabs, tab, "close-right");
          const closeLeftTabTargets = getWorkspaceSessionTabsToClose(tabs, tab, "close-left");

          return (
            <ContextMenu key={`${tab.kind}:${tab.id}`}>
              <ContextMenuTrigger asChild>
                <Button
                  variant="ghost"
                  style={{ width: SESSION_TAB_WIDTH }}
                  title={tab.name}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "h-8 min-w-0 flex-none justify-start gap-2 rounded-md border-0 px-3 text-xs",
                    isActive
                      ? "bg-secondary text-foreground hover:bg-secondary"
                      : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => onSelect(tab)}
                >
                  <WorkspaceSessionTabIcon tab={tab} />
                  <span className="min-w-0 flex-1 truncate text-left">{tab.name}</span>
                  {isBusyAgent ? (
                    <BusyIndicator className="size-3.5 shrink-0" />
                  ) : (
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        tab.status === "running"
                          ? "bg-emerald-500"
                          : tab.status === "starting"
                            ? "bg-amber-500"
                            : tab.status === "error"
                              ? "bg-destructive"
                              : "bg-muted-foreground/50"
                      )}
                    />
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    className="grid size-5 shrink-0 place-items-center rounded-[4px] text-muted-foreground transition hover:bg-accent/70 hover:text-foreground"
                    onClick={(event) => {
                      event.stopPropagation();
                      onClose(tab);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onClose(tab);
                      }
                    }}
                    aria-label={`Close ${tab.name}`}
                  >
                    <X className="size-3.5" />
                  </span>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-64">
                <ContextMenuItem
                  disabled={closeTabTargets.length === 0}
                  onSelect={() => runCloseAction(closeTabTargets, onCloseMany)}
                >
                  Close Tab
                  <span className="ml-auto text-[11px] text-muted-foreground">{closeTabShortcut}</span>
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={closeOtherTabTargets.length === 0}
                  onSelect={() => runCloseAction(closeOtherTabTargets, onCloseMany)}
                >
                  Close Others
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={closeRightTabTargets.length === 0}
                  onSelect={() => runCloseAction(closeRightTabTargets, onCloseMany)}
                >
                  Close Tabs to the Right
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={closeLeftTabTargets.length === 0}
                  onSelect={() => runCloseAction(closeLeftTabTargets, onCloseMany)}
                >
                  Close Tabs to the Left
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
        <WorkspaceSessionTabOverflow tabs={overflowTabs} activeTabId={activeTabId} onSelect={onSelect} />
        <DropdownMenu
          align="end"
          widthClassName="w-72"
          trigger={(
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="New session tab"
            >
              <Plus className="size-4" />
            </Button>
          )}
        >
          <DropdownMenuItem onSelect={onCreateThread}>
            <MessageSquare className="size-4" /><span className="whitespace-nowrap text-xs">New thread</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{newAgentShortcut}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCreateTerminalFromDefaults}>
            <TerminalSquare className="size-4" />
            <span className="whitespace-nowrap text-xs">New Terminal (Defaults)</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{newTerminalShortcut}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCreateTerminal}>
            <TerminalSquare className="size-4" />
            <span className="whitespace-nowrap text-xs">New Terminal</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{newTerminalShortcut}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCreateBrowser}>
            <Globe className="size-4" />
            <span className="whitespace-nowrap text-xs">New browser</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{newBrowserShortcut}</span>
          </DropdownMenuItem>

        </DropdownMenu>
      </div>
    </div>
  );
}
