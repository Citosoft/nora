import { writeStoredBrowserTabsState } from "@/components/app/logic/appPersistence";
import {
  buildBrowserAnnotationStorageKey,
  removeStoredBrowserAnnotationsForScope
} from "@/components/app/logic/browserAnnotationPersistence";
import { createBrowserTab } from "@/components/app/logic/browserTabs";
import type { UseBrowserTabsArgs, UseBrowserTabsResult } from "@/components/app/types/appHooks.types";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback, useEffect, useRef } from "react";

export function useBrowserTabs({
  browserTabs,
  focusedBrowserTabId,
  setUiState,
  openInternalBrowserOnNewPortDetection,
  onShowBrowser
}: UseBrowserTabsArgs): UseBrowserTabsResult {
  const snapshot = useCanonicalAppSnapshot();
  const detectedLocalUrlByTerminalIdRef = useRef<Record<string, string | null>>({});

  const openWorkspaceBrowser = useCallback((projectId: string, url?: string): void => {
    setUiState((current) => {
      const normalizedUrl = (url ?? "about:blank").trim() || "about:blank";
      const existingTab = current.browserTabs.find((tab) =>
        tab.projectId === projectId && (tab.history[tab.historyIndex] ?? "about:blank") === normalizedUrl
      ) ?? null;
      if (existingTab) {
        return {
          ...current,
          focusedBrowserTabId: existingTab.id
        };
      }

      const nextTab = createBrowserTab(projectId, normalizedUrl);
      return {
        ...current,
        browserTabs: [...current.browserTabs, nextTab],
        focusedBrowserTabId: nextTab.id
      };
    });
    onShowBrowser();
  }, [onShowBrowser, setUiState]);

  const focusBrowserTab = useCallback((tabId: string): void => {
    setUiState((current) => ({
      ...current,
      focusedBrowserTabId: tabId,
      focusedAiChatTabId: null,
      focusedForgeViewerTabId: null
    }));
  }, [setUiState]);

  const closeBrowserTab = useCallback((tabId: string): void => {
    setUiState((current) => {
      const closingTab = current.browserTabs.find((tab) => tab.id === tabId) ?? null;
      if (closingTab) {
        removeStoredBrowserAnnotationsForScope(buildBrowserAnnotationStorageKey(closingTab.projectId, closingTab.id));
      }
      const nextTabs = current.browserTabs.filter((tab) => tab.id !== tabId);
      const closingFocusedTab = current.focusedBrowserTabId === tabId;
      const nextFocusedBrowserTabId = closingFocusedTab
        ? (closingTab
            ? nextTabs.filter((tab) => tab.projectId === closingTab.projectId).at(-1)?.id ?? null
            : null)
        : current.focusedBrowserTabId;
      return {
        ...current,
        browserTabs: nextTabs,
        focusedBrowserTabId: nextFocusedBrowserTabId
      };
    });
  }, [setUiState]);

  const updateBrowserTab = useCallback((tabId: string, updater: (current: typeof browserTabs[number]) => typeof browserTabs[number]): void => {
    setUiState((current) => ({
      ...current,
      browserTabs: current.browserTabs.map((tab) => (tab.id === tabId ? updater(tab) : tab))
    }));
  }, [setUiState]);

  useEffect(() => {
    writeStoredBrowserTabsState({
      tabs: browserTabs,
      focusedTabId: focusedBrowserTabId
    });
  }, [browserTabs, focusedBrowserTabId]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const validProjectIds = new Set([
      ...(snapshot.project ? [snapshot.project.id] : []),
      ...snapshot.workspaces.map((workspace) => workspace.project.id)
    ]);

    if (validProjectIds.size === 0) {
      return;
    }

    setUiState((current) => {
      const nextBrowserTabs = current.browserTabs.filter((tab) => validProjectIds.has(tab.projectId));
      const nextFocusedTabId =
        current.focusedBrowserTabId && nextBrowserTabs.some((tab) => tab.id === current.focusedBrowserTabId)
          ? current.focusedBrowserTabId
          : null;

      if (
        nextBrowserTabs.length === current.browserTabs.length &&
        nextFocusedTabId === current.focusedBrowserTabId
      ) {
        return current;
      }

      return {
        ...current,
        browserTabs: nextBrowserTabs,
        focusedBrowserTabId: nextFocusedTabId
      };
    });
  }, [setUiState, snapshot]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const terminalProjectPairs = [
      ...snapshot.terminals.map((terminal) => ({ projectId: terminal.projectId, terminal })),
      ...snapshot.workspaces.flatMap((workspace) =>
        workspace.terminals.map((terminal) => ({ projectId: workspace.project.id, terminal }))
      )
    ];
    const nextDetectedLocalUrlByTerminalId: Record<string, string | null> = {};

    for (const { terminal } of terminalProjectPairs) {
      nextDetectedLocalUrlByTerminalId[terminal.id] = terminal.detectedLocalUrl ?? null;
    }

    const previousDetectedLocalUrlByTerminalId = detectedLocalUrlByTerminalIdRef.current;
    const hasBaseline = Object.keys(previousDetectedLocalUrlByTerminalId).length > 0;
    detectedLocalUrlByTerminalIdRef.current = nextDetectedLocalUrlByTerminalId;

    if (!openInternalBrowserOnNewPortDetection || !hasBaseline) {
      return;
    }

    for (const { projectId, terminal } of terminalProjectPairs) {
      const detectedLocalUrl = terminal.detectedLocalUrl ?? null;
      if (!detectedLocalUrl) {
        continue;
      }

      const previousDetectedLocalUrl = previousDetectedLocalUrlByTerminalId[terminal.id];
      if (typeof previousDetectedLocalUrl === "undefined" || previousDetectedLocalUrl === detectedLocalUrl) {
        continue;
      }

      openWorkspaceBrowser(projectId, detectedLocalUrl);
    }
  }, [openInternalBrowserOnNewPortDetection, openWorkspaceBrowser, snapshot]);

  return {
    openWorkspaceBrowser,
    focusBrowserTab,
    closeBrowserTab,
    updateBrowserTab
  };
}
