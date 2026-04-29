import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import { getWorkspaceSessionTabsToClose } from "@/components/app/logic/workspaceSessionTabContextActions";
import { BusyIndicator } from "@/components/app/shared/BusyIndicator";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { WorkspaceSessionTabsProps } from "@/components/app/types/component.types";
import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isAgentToolAvailable } from "@shared/agentToolState";
import { Bot, Expand, FileText, GitPullRequest, Globe, LayoutPanelTop, MessageSquare, Plus, TerminalSquare, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function WorkspaceSessionTabs({
  tabs,
  activeTabId,
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
  const [contextMenuState, setContextMenuState] = useState<{ tab: WorkspaceSessionTab; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!contextMenuState) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!contextMenuRef.current?.contains(target)) {
        setContextMenuState(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenuState(null);
      }
    };
    const handleViewportChange = () => {
      setContextMenuState(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [contextMenuState]);

  const contextTab = useMemo(() => {
    if (!contextMenuState) {
      return null;
    }
    return tabs.find((tab) => tab.kind === contextMenuState.tab.kind && tab.id === contextMenuState.tab.id) ?? null;
  }, [contextMenuState, tabs]);
  const closeTabTargets = useMemo(
    () => (contextTab ? getWorkspaceSessionTabsToClose(tabs, contextTab, "close") : []),
    [contextTab, tabs]
  );
  const closeOtherTabTargets = useMemo(
    () => (contextTab ? getWorkspaceSessionTabsToClose(tabs, contextTab, "close-others") : []),
    [contextTab, tabs]
  );
  const closeRightTabTargets = useMemo(
    () => (contextTab ? getWorkspaceSessionTabsToClose(tabs, contextTab, "close-right") : []),
    [contextTab, tabs]
  );
  const closeLeftTabTargets = useMemo(
    () => (contextTab ? getWorkspaceSessionTabsToClose(tabs, contextTab, "close-left") : []),
    [contextTab, tabs]
  );
  const runCloseAction = useCallback((targets: WorkspaceSessionTab[]) => {
    if (!targets.length) {
      return;
    }
    targets.forEach((tab) => onClose(tab));
    setContextMenuState(null);
  }, [onClose]);
  const contextMenuX = contextMenuState ? Math.max(8, Math.min(contextMenuState.x, window.innerWidth - 220)) : 0;
  const contextMenuY = contextMenuState ? Math.max(8, Math.min(contextMenuState.y, window.innerHeight - 170)) : 0;

  return (
    <div className="border-b border-border/60 bg-background/70">
      <div className="thin-scrollbar flex min-h-0 items-stretch overflow-x-auto">
        <div className="flex min-h-0 items-stretch">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isBusyAgent = tab.kind === "agent" && isAgentBusyAt(tab, now);
            return (
              <Button
                key={`${tab.kind}:${tab.id}`}
                variant="ghost"
                className={cn(
                  "h-[42px] shrink-0 gap-2 rounded-none border-y-0 border-l-0 px-3 text-sm",
                  isActive
                    ? "border-r border-border bg-accent/70 text-foreground"
                    : "border-r border-border/60 bg-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                )}
                onClick={() => onSelect(tab)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setContextMenuState({ tab, x: event.clientX, y: event.clientY });
                }}
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
            );
          })}
          <DropdownMenu
            align="end"
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
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCreateTerminal}>
              <TerminalSquare className="size-4" />
              <span className="whitespace-nowrap text-xs">New Terminal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCreateBrowser}>
              <Globe className="size-4" />
              <span className="whitespace-nowrap text-xs">New browser</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCreateAiChat}>
              <MessageSquare className="size-4" />
              <span className="whitespace-nowrap text-xs">New AI chat</span>
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
      {contextMenuState && contextTab ? (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] w-52 rounded-[4px] border border-border/70 bg-popover/95 p-1 shadow-xl backdrop-blur"
          style={{ left: contextMenuX, top: contextMenuY }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeTabTargets.length === 0}
            onClick={() => runCloseAction(closeTabTargets)}
          >
            Close Tab
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeOtherTabTargets.length === 0}
            onClick={() => runCloseAction(closeOtherTabTargets)}
          >
            Close Others
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeRightTabTargets.length === 0}
            onClick={() => runCloseAction(closeRightTabTargets)}
          >
            Close Tabs to the Right
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeLeftTabTargets.length === 0}
            onClick={() => runCloseAction(closeLeftTabTargets)}
          >
            Close Tabs to the Left
          </button>
        </div>
      ) : null}
    </div>
  );
}
