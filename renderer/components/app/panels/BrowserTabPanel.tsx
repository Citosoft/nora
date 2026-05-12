import {
  useWorkspaceSessionPanelActions,
  useWorkspaceSessionPanelData
} from "@/components/app/context/workspaceSessionPanelContext";
import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useSessionCenterPorts } from "@/components/app/hooks/useSessionCenterPorts";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { handoffPromptToAgent } from "@/components/app/logic/agentHandoff";
import { markBrowserTabLoadStopped, updateTabNavigationState } from "@/components/app/logic/browserTabNavigation";
import { getBrowserTabTitle, getCurrentBrowserUrl, normalizeBrowserUrl } from "@/components/app/logic/browserTabs";
import { launchAgent } from "@/components/app/logic/launchAgentWithInstruction";
import type { BrowserTabState } from "@/components/app/types";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type { AgentCatalogEntry, AgentSession, CreateAgentPayload } from "@shared/appTypes";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Bug, ExternalLink, Globe, RefreshCcw } from "lucide-react";
import type { FocusEvent, MouseEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type BrowserTabPanelProps = {
  tab?: BrowserTabState | null;
  onUpdateTab?: (tabId: string, updater: (current: BrowserTabState) => BrowserTabState) => void;
  agents?: AgentSession[];
  tools?: AgentCatalogEntry[];
  onFocusAgent?: (agentId: string) => void;
  onCreateTaskFromSelection?: (selectionText: string) => Promise<void>;
  onCreateSpecFromSelection?: (selectionText: string) => Promise<void>;
};

type SelectionContextMenuState = {
  text: string;
  x: number;
  y: number;
};

type ElectronWebviewContextMenuEvent = Event & {
  params?: {
    x?: number;
    y?: number;
    selectionText?: string;
  };
};

type ExecutableWebviewElement = HTMLWebViewElement & {
  executeJavaScript: (code: string, userGesture?: boolean) => Promise<unknown>;
};

export function BrowserTabPanel(props: BrowserTabPanelProps) {
  const sessionData = useWorkspaceSessionPanelData();
  const sessionActions = useWorkspaceSessionPanelActions();
  const snapshot = useCanonicalAppSnapshot();
  const { sessionSurface } = useSessionCenterPorts();
  const tab = props.tab ?? sessionSurface.focusedBrowserTab;
  const onUpdateTab = props.onUpdateTab ?? sessionActions.onUpdateBrowserTab;
  const agents = props.agents ?? sessionData.workspace?.agents ?? snapshot?.agents ?? [];
  const tools = props.tools ?? snapshot?.agentCatalog ?? [];
  const onFocusAgent = props.onFocusAgent ?? sessionActions.onFocusAgent;
  const onCreateTaskFromSelection = props.onCreateTaskFromSelection
    ?? (tab ? (selectionText: string) => sessionActions.onCreateWorkspaceTaskFromSelection(tab.projectId, selectionText) : undefined);
  const onCreateSpecFromSelection = props.onCreateSpecFromSelection
    ?? (tab ? (selectionText: string) => sessionActions.onCreateWorkspaceSpecFromSelection(tab.projectId, selectionText) : undefined);

  if (!tab || !onCreateTaskFromSelection || !onCreateSpecFromSelection) {
    return null;
  }

  const currentUrl = getCurrentBrowserUrl(tab);
  const workspaceInstructionPath = sessionData.project?.workspaceInstructionFile?.absolutePath ?? null;
  const [addressInput, setAddressInput] = useState(currentUrl);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [selectionMenu, setSelectionMenu] = useState<SelectionContextMenuState | null>(null);
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const selectionMenuTriggerRef = useRef<HTMLSpanElement | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const canGoBack = tab.historyIndex > 0;
  const canGoForward = tab.historyIndex < tab.history.length - 1;
  const webviewKey = useMemo(() => `${tab.id}:${reloadNonce}`, [reloadNonce, tab.id]);
  const availableTools = useMemo(() => tools.filter((tool) => isAgentToolAvailable(tool)), [tools]);
  const runningAgents = useMemo(() => agents.filter((agent) => agent.status === "running"), [agents]);

  useEffect(() => {
    setAddressInput(currentUrl);
  }, [currentUrl]);

  useLayoutEffect(() => {
    if (currentUrl !== "about:blank") {
      return;
    }

    const focusAddress = () => {
      const el = addressInputRef.current;
      if (!el) {
        return;
      }
      el.focus();
      el.select();
    };

    focusAddress();
    const rafId = requestAnimationFrame(focusAddress);
    return () => cancelAnimationFrame(rafId);
  }, [currentUrl, tab.id]);

  useEffect(() => {
    if (!selectionMenuTriggerRef.current || !selectionMenu) {
      return;
    }
    selectionMenuTriggerRef.current.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: selectionMenu.x,
        clientY: selectionMenu.y
      })
    );
  }, [selectionMenu]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || currentUrl === "about:blank") {
      return;
    }
    const titledWebview = webview as HTMLWebViewElement & { getTitle?: () => string };

    const handleDidStartLoading = () => {
      onUpdateTab(tab.id, (current) => ({
        ...current,
        status: "starting"
      }));
    };

    const handleDidStopLoading = () => {
      onUpdateTab(tab.id, (current) => markBrowserTabLoadStopped(current, titledWebview.getTitle?.()));
    };

    const handleDidNavigate: EventListener = (event) => {
      const navigationEvent = event as unknown as ElectronDidNavigateEvent;
      if (!navigationEvent.isMainFrame) {
        return;
      }

      onUpdateTab(tab.id, (current) => updateTabNavigationState(current, navigationEvent.url, "running"));
    };

    const handlePageTitleUpdated: EventListener = (event) => {
      const titleEvent = event as unknown as ElectronPageTitleUpdatedEvent;
      onUpdateTab(tab.id, (current) => ({
        ...current,
        title: titleEvent.title?.trim() || getBrowserTabTitle(getCurrentBrowserUrl(current))
      }));
    };

    const handlePageFaviconUpdated: EventListener = (event) => {
      const faviconEvent = event as unknown as { favicons?: string[] };
      onUpdateTab(tab.id, (current) => ({
        ...current,
        faviconUrl: faviconEvent.favicons?.find((entry) => typeof entry === "string" && entry.trim().length > 0) ?? null
      }));
    };

    const handleDidFailLoad: EventListener = (event) => {
      const failLoadEvent = event as unknown as ElectronDidFailLoadEvent;
      if (!failLoadEvent.isMainFrame || failLoadEvent.errorCode === -3) {
        return;
      }

      onUpdateTab(tab.id, (current) => ({
        ...updateTabNavigationState(current, failLoadEvent.validatedURL || currentUrl, "error"),
        title: getBrowserTabTitle(failLoadEvent.validatedURL || currentUrl),
        faviconUrl: null
      }));
    };

    const handleContextMenu: EventListener = (event) => {
      const contextEvent = event as ElectronWebviewContextMenuEvent;
      const selectionFromEvent = contextEvent.params?.selectionText?.trim() || "";
      const showMenuForSelection = (selectedText: string) => {
        if (!selectedText) {
          setSelectionMenu(null);
          return;
        }
        const rect = webview.getBoundingClientRect();
        const rawX = contextEvent.params?.x;
        const rawY = contextEvent.params?.y;
        const x = typeof rawX === "number" && rawX >= 0 && rawX <= window.innerWidth
          ? rawX
          : rect.left + (rawX ?? 0);
        const y = typeof rawY === "number" && rawY >= 0 && rawY <= window.innerHeight
          ? rawY
          : rect.top + (rawY ?? 0);
        setSelectionMenu({ text: selectedText, x, y });
      };

      if (selectionFromEvent) {
        showMenuForSelection(selectionFromEvent);
        return;
      }

      const executableWebview = webview as ExecutableWebviewElement;
      void executableWebview.executeJavaScript("window.getSelection ? window.getSelection().toString() : ''", true)
        .then((rawSelection: unknown) => {
          const selectedText = typeof rawSelection === "string" ? rawSelection.trim() : "";
          showMenuForSelection(selectedText);
        })
        .catch(() => {
          setSelectionMenu(null);
        });
    };

    webview.addEventListener("did-start-loading", handleDidStartLoading);
    webview.addEventListener("did-stop-loading", handleDidStopLoading);
    webview.addEventListener("did-navigate", handleDidNavigate);
    webview.addEventListener("page-title-updated", handlePageTitleUpdated);
    webview.addEventListener("page-favicon-updated", handlePageFaviconUpdated);
    webview.addEventListener("did-fail-load", handleDidFailLoad);
    webview.addEventListener("context-menu", handleContextMenu);

    return () => {
      webview.removeEventListener("did-start-loading", handleDidStartLoading);
      webview.removeEventListener("did-stop-loading", handleDidStopLoading);
      webview.removeEventListener("did-navigate", handleDidNavigate);
      webview.removeEventListener("page-title-updated", handlePageTitleUpdated);
      webview.removeEventListener("page-favicon-updated", handlePageFaviconUpdated);
      webview.removeEventListener("did-fail-load", handleDidFailLoad);
      webview.removeEventListener("context-menu", handleContextMenu);
    };
  }, [currentUrl, onUpdateTab, tab.id]);

  useEffect(() => {
    if (!selectionMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-browser-selection-menu='true']")) {
        return;
      }
      setSelectionMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectionMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectionMenu]);

  const handleSpawnAgentWithSelection = async (toolId: string) => {
    if (!selectionMenu) {
      return;
    }

    const selectedText = selectionMenu.text;
    const payload: CreateAgentPayload = {
      toolId,
      name: "Browser Selection",
      task: `Review and act on this selected browser text:\n\n${selectedText}`,
      commandOverride: "",
      launchSource: "browser-selection",
      mode: "read",
      target: { kind: "session-default" }
    };

    try {
      const launchResult = await launchAgent({
        payload,
        createAgent: noraAgentClient.createAgent
      });
      if (launchResult) {
        await handoffPromptToAgent({
          agentId: launchResult.agentId,
          prompt: {
            source: "browser-selection",
            title: "Browser selection",
            text: `Selected text from browser:\n\n${selectedText}`,
            workspacePaths: workspaceInstructionPath ? [{ path: workspaceInstructionPath, kind: "file" }] : [],
            contextSelections: payload.contextSelections ?? [],
            references: [
              ...(currentUrl ? [{ kind: "workspace-path" as const, label: "Browser URL", value: currentUrl }] : []),
              ...(workspaceInstructionPath
                ? [{ kind: "workspace-path" as const, label: "Workspace instructions", value: workspaceInstructionPath }]
                : [])
            ]
          },
          updateSnapshot: () => {},
          focusAgent: async (focusedAgentId: string) => {
            onFocusAgent(focusedAgentId);
          }
        });
        onFocusAgent(launchResult.agentId);
      }
    } finally {
      setSelectionMenu(null);
    }
  };

  const handleInjectSelectionToAgent = async (agentId: string) => {
    if (!selectionMenu) {
      return;
    }

    const selectedText = selectionMenu.text;
    try {
      await handoffPromptToAgent({
        agentId,
        prompt: {
          source: "browser-selection",
          title: "Browser selection",
          text: `Selected text from browser:\n\n${selectedText}`,
          workspacePaths: workspaceInstructionPath ? [{ path: workspaceInstructionPath, kind: "file" }] : [],
          contextSelections: [],
          references: [
            ...(currentUrl ? [{ kind: "workspace-path" as const, label: "Browser URL", value: currentUrl }] : []),
            ...(workspaceInstructionPath
              ? [{ kind: "workspace-path" as const, label: "Workspace instructions", value: workspaceInstructionPath }]
              : [])
          ]
        },
        focusAgent: async (focusedAgentId: string) => {
          onFocusAgent(focusedAgentId);
        },
        updateSnapshot: () => {}
      });
    } finally {
      setSelectionMenu(null);
    }
  };

  const handleCreateTaskFromSelection = async () => {
    if (!selectionMenu) {
      return;
    }

    try {
      await onCreateTaskFromSelection(selectionMenu.text);
    } finally {
      setSelectionMenu(null);
    }
  };

  const handleCreateSpecFromSelection = async () => {
    if (!selectionMenu) {
      return;
    }

    try {
      await onCreateSpecFromSelection(selectionMenu.text);
    } finally {
      setSelectionMenu(null);
    }
  };

  const navigateToInput = () => {
    const nextUrl = normalizeBrowserUrl(addressInput);
    if (!nextUrl) {
      onUpdateTab(tab.id, (current) => ({
        ...current,
        status: "error"
      }));
      return;
    }

    const isReload = currentUrl === nextUrl;
    onUpdateTab(tab.id, (current) => {
      if (getCurrentBrowserUrl(current) === nextUrl) {
        return {
          ...current,
          title: getBrowserTabTitle(nextUrl),
          faviconUrl: null,
          status: "starting"
        };
      }

      const nextHistory = current.history.slice(0, current.historyIndex + 1);
      nextHistory.push(nextUrl);
      return {
        ...current,
        title: getBrowserTabTitle(nextUrl),
        faviconUrl: null,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
        status: "starting"
      };
    });

    if (isReload) {
      webviewRef.current?.reload();
    }
  };

  const handleAddressInputMouseDown = (event: MouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (document.activeElement === input) {
      return;
    }

    // Keep the first click behavior consistent with browser address bars:
    // focus and select the full URL instead of placing the caret at click position.
    event.preventDefault();
    input.focus();
    input.select();
  };

  const handleAddressInputFocus = (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  };

  return (
    <Card className="center-column-surface h-full min-h-0 rounded-none border-x-0 border-t-0 bg-card/95">
      <CardContent className="grid h-full grid-rows-[auto_minmax(0,1fr)] p-0">
        <div className="border-b border-border/60 bg-background/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 overflow-hidden rounded-[6px] border border-border/70 bg-background/40">
              <Button
                variant="outline"
                size="icon"
                className="button-default-surface h-10 w-10 shrink-0 rounded-none border-0 border-r border-border/70 shadow-none"
                onClick={() => {
                  if (webviewRef.current?.canGoBack()) {
                    webviewRef.current.goBack();
                    return;
                  }

                  onUpdateTab(tab.id, (current) => ({
                    ...current,
                    historyIndex: Math.max(0, current.historyIndex - 1),
                    status: "starting"
                  }));
                }}
                disabled={!canGoBack}
                aria-label="Go back"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-none border-0 border-r border-border/70 shadow-none"
                onClick={() => {
                  if (webviewRef.current?.canGoForward()) {
                    webviewRef.current.goForward();
                    return;
                  }

                  onUpdateTab(tab.id, (current) => ({
                    ...current,
                    historyIndex: Math.min(current.history.length - 1, current.historyIndex + 1),
                    status: "starting"
                  }));
                }}
                disabled={!canGoForward}
                aria-label="Go forward"
              >
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-none border-0 shadow-none"
                onClick={() => {
                  onUpdateTab(tab.id, (current) => ({ ...current, status: "starting" }));
                  if (currentUrl === "about:blank") {
                    setReloadNonce((current) => current + 1);
                    return;
                  }
                  webviewRef.current?.reload();
                }}
                aria-label="Reload page"
              >
                <RefreshCcw className="size-4" />
              </Button>
            </div>
            <div
              className={cn(
                "relative flex min-w-0 flex-1 items-stretch overflow-hidden rounded-[6px] border border-border/70 bg-background/40",
                "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
              )}
            >
              <Globe className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={addressInputRef}
                value={addressInput}
                onChange={(event) => setAddressInput(event.target.value)}
                onMouseDown={handleAddressInputMouseDown}
                onFocus={handleAddressInputFocus}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    navigateToInput();
                  }
                }}
                placeholder="Enter a URL"
                className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                variant="outline"
                onClick={navigateToInput}
                className="button-default-surface h-10 shrink-0 rounded-none border-0 border-l border-border/70 px-4 text-[12px] font-semibold shadow-none"
              >
                Go
              </Button>
            </div>
            <div className="flex shrink-0 overflow-hidden rounded-[6px] border border-border/70 bg-background/40">
              <Button
                variant="outline"
                size="icon"
                className="button-default-surface h-10 w-10 shrink-0 rounded-none border-0 border-r border-border/70 shadow-none"
                onClick={() => {
                  if (currentUrl === "about:blank") {
                    return;
                  }
                  webviewRef.current?.openDevTools();
                }}
                disabled={currentUrl === "about:blank"}
                aria-label="Open developer tools for this page"
              >
                <Bug className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-none border-0 shadow-none"
                onClick={() => {
                  if (currentUrl !== "about:blank") {
                    void noraSystemClient.openExternalUrl(currentUrl);
                  }
                }}
                disabled={currentUrl === "about:blank"}
                aria-label="Open in external browser"
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        {currentUrl === "about:blank" ? (
          <div className="flex items-center justify-center bg-background/30 p-8 text-center">
            <div className="max-w-md space-y-3">
              <Globe className="mx-auto size-10 text-primary" />
              <div className="text-lg font-medium text-foreground">New browser tab</div>
              <div className="text-sm text-muted-foreground">
                Enter a URL in the address bar to open a page.
              </div>
            </div>
          </div>
        ) : (
          <div className="relative min-h-0">
            <webview
              key={webviewKey}
              ref={(node) => {
                webviewRef.current = node;
              }}
              src={currentUrl}
              partition="persist:nora-browser"
              className="h-full w-full border-0 bg-white"
            />
            {tab.status === "error" ? (
              <div className="absolute inset-0 grid place-items-center bg-background/85 p-8 text-center">
                <div className="max-w-md space-y-3">
                  <ExternalLink className="mx-auto size-10 text-primary" />
                  <div className="text-lg font-medium text-foreground">Page failed to load</div>
                  <div className="text-sm text-muted-foreground">
                    The browser view could not load {currentUrl}. Retry the page or open it externally.
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        onUpdateTab(tab.id, (current) => ({ ...current, status: "starting" }));
                        webviewRef.current?.reload();
                      }}
                    >
                      <RefreshCcw className="size-4" />
                      Retry
                    </Button>
                    <Button
                      onClick={() => {
                        void noraSystemClient.openExternalUrl(currentUrl);
                      }}
                    >
                      <ExternalLink className="size-4" />
                      Open externally
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            {selectionMenu ? (
              <ContextMenu onOpenChange={(open) => {
                if (!open) {
                  setSelectionMenu(null);
                }
              }}>
                <ContextMenuTrigger asChild>
                  <span
                    ref={selectionMenuTriggerRef}
                    data-browser-selection-menu="true"
                    className="fixed h-px w-px"
                    style={{
                      left: Math.max(12, Math.min(selectionMenu.x, window.innerWidth - 320)),
                      top: Math.max(12, Math.min(selectionMenu.y, window.innerHeight - 16))
                    }}
                  />
                </ContextMenuTrigger>
                <ContextMenuContent className="min-w-72">
                  <div className="px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Selection Actions</div>
                  <ContextMenuItem onSelect={() => {
                    void handleCreateTaskFromSelection();
                  }}>
                    <span>Create task from selection</span>
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => {
                    void handleCreateSpecFromSelection();
                  }}>
                    <span>Create spec from selection</span>
                  </ContextMenuItem>
                  <div className="my-1 border-t border-border/60" />
                  {availableTools.map((tool) => (
                    <ContextMenuItem key={`spawn-${tool.id}`} onSelect={() => {
                      void handleSpawnAgentWithSelection(tool.id);
                    }}>
                      <AgentToolIcon
                        toolId={tool.id}
                        label={tool.label}
                        className="size-5 shrink-0 rounded-sm"
                        imageClassName="size-4 rounded-sm"
                      />
                      <span className="min-w-0 flex-1">Spawn {tool.label} agent with selection</span>
                    </ContextMenuItem>
                  ))}
                  {runningAgents.length ? (
                    <>
                      <div className="my-1 border-t border-border/60" />
                      {runningAgents.map((agent) => (
                        <ContextMenuItem key={`inject-${agent.id}`} onSelect={() => {
                          void handleInjectSelectionToAgent(agent.id);
                        }}>
                          <AgentToolIcon
                            toolId={agent.toolId}
                            label={agent.toolLabel}
                            className="size-5 shrink-0 rounded-sm"
                            imageClassName="size-4 rounded-sm"
                          />
                          <span className="min-w-0 flex-1 truncate">Inject into {agent.name}</span>
                        </ContextMenuItem>
                      ))}
                    </>
                  ) : null}
                </ContextMenuContent>
              </ContextMenu>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
