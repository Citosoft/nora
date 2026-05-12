import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import { SHORTCUT_DEFINITIONS, formatShortcutKeys } from "@/components/app/logic/keyboardShortcuts";
import { getWorkspaceSessionTabsToClose } from "@/components/app/logic/workspaceSessionTabContextActions";
import { BusyIndicator } from "@/components/app/shared/BusyIndicator";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { WorkspaceSessionTabsProps } from "@/components/app/types/component.types";
import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isAgentToolAvailable } from "@shared/agentToolState";
import { Bot, Expand, FileText, GitPullRequest, Globe, LayoutPanelTop, MessageSquare, Plus, TerminalSquare, X } from "lucide-react";
import { useEffect, useState } from "react";

function runCloseAction(targets: WorkspaceSessionTab[], onClose: (tab: WorkspaceSessionTab) => void) {
  if (!targets.length) {
    return;
  }
  targets.forEach((tab) => onClose(tab));
}

export function WorkspaceSessionTabs({
  tabs,
  activeTabId,
  platform,
  tools,
  onSelect,
  onClose,
  onCreateAgent,
  onCreateTerminalFromDefaults,
  onCreateTerminal,
  onCreateBrowser,
  onCreateAiChat
}: WorkspaceSessionTabsProps) {
  const availableTools = tools.filter((tool) => isAgentToolAvailable(tool));
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
    <div className="border-b border-border/60 bg-background/70">
      <div className="thin-scrollbar flex min-h-0 items-stretch overflow-x-auto">
        <div className="flex min-h-0 items-stretch">
          {tabs.map((tab) => {
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
                    className={cn(
                      "h-[42px] shrink-0 gap-2 rounded-none border-y-0 border-l-0 px-3 text-sm",
                      isActive
                        ? "border-r border-border bg-accent/70 text-foreground"
                        : "border-r border-border/60 bg-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    )}
                    onClick={() => onSelect(tab)}
                  >
                    {tab.kind === "agent" ? (
                      <AgentToolIcon
                        toolId={tab.toolId}
                        label={tab.toolLabel}
                        className="size-4 shrink-0 rounded-sm bg-transparent"
                        imageClassName="size-4 rounded-sm"
                      />
                    ) : tab.kind === "terminal" ? (
                      <TerminalSquare className="size-4 shrink-0" />
                    ) : tab.kind === "forge" ? (
                      <GitPullRequest className="size-4 shrink-0" />
                    ) : tab.kind === "ai-chat" ? (
                      <MessageSquare className="size-4 shrink-0" />
                    ) : tab.kind === "view" ? (
                      <LayoutPanelTop className="size-4 shrink-0" />
                    ) : tab.kind === "file" ? (
                      <FileText className="size-4 shrink-0" />
                    ) : tab.kind === "diff" ? (
                      <Expand className="size-4 shrink-0" />
                    ) : tab.kind === "browser" && tab.faviconUrl ? (
                      <img
                        src={tab.faviconUrl}
                        alt=""
                        className="size-4 shrink-0 rounded-sm object-contain"
                      />
                    ) : (
                      <Globe className="size-4 shrink-0" />
                    )}
                    <span className="max-w-48 truncate">{tab.name}</span>
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
                    onSelect={() => runCloseAction(closeTabTargets, onClose)}
                  >
                    Close Tab
                    <span className="ml-auto text-[11px] text-muted-foreground">{closeTabShortcut}</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={closeOtherTabTargets.length === 0}
                    onSelect={() => runCloseAction(closeOtherTabTargets, onClose)}
                  >
                    Close Others
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={closeRightTabTargets.length === 0}
                    onSelect={() => runCloseAction(closeRightTabTargets, onClose)}
                  >
                    Close Tabs to the Right
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={closeLeftTabTargets.length === 0}
                    onSelect={() => runCloseAction(closeLeftTabTargets, onClose)}
                  >
                    Close Tabs to the Left
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
          <DropdownMenu
            align="end"
            widthClassName="w-72"
            trigger={(
              <Button
                variant="ghost"
                size="icon"
                className="h-[42px] w-[42px] shrink-0 rounded-none border-y-0 border-l-0 border-r border-border/60 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                aria-label="New session tab"
              >
                <Plus className="size-4" />
              </Button>
            )}
          >
            {availableTools.length ? availableTools.map((tool) => (
              <DropdownMenuItem key={tool.id} onSelect={() => onCreateAgent(tool.id)}>
                <AgentToolIcon
                  toolId={tool.id}
                  label={tool.label}
                  className="size-4 shrink-0 rounded-sm bg-transparent"
                  imageClassName="size-4 rounded-sm"
                />
                <span className="whitespace-nowrap text-xs">New {tool.label} agent</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{newAgentShortcut}</span>
              </DropdownMenuItem>
            )) : (
              <DropdownMenuItem onSelect={() => {}}>
                <Bot className="size-4" />
                <span className="whitespace-nowrap text-xs">No agent CLIs available</span>
              </DropdownMenuItem>
            )}
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
            <DropdownMenuItem onSelect={onCreateAiChat}>
              <MessageSquare className="size-4" />
              <span className="whitespace-nowrap text-xs">New AI chat</span>
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
