import { createAiChatTab } from "@/components/app/logic/aiChatTabs";
import { writeStoredAiChatTabsState, writeStoredForgeViewerTabsState } from "@/components/app/logic/appPersistence";
import { createForgeViewerTab } from "@/components/app/logic/forgeViewerTabs";
import type { AiChatMessage, AiChatReasoningLevel } from "@/components/app/types";
import type {
  ForgeRepoOverride,
  UseAppCenterTabsArgs,
  UseAppCenterTabsResult
} from "@/components/app/types/appCenterTabs.types";
import type { ForgeWorkItemSummary } from "@shared/appTypes";
import { useCallback, useEffect } from "react";

export function useAppCenterTabs({
  aiChatTabs,
  focusedAiChatTabId,
  forgeViewerTabs,
  focusedForgeViewerTabId,
  setUiState,
  setActiveView,
  openWorkspaceBrowser,
  gitlabHost
}: UseAppCenterTabsArgs): UseAppCenterTabsResult {
  useEffect(() => {
    writeStoredAiChatTabsState({
      tabs: aiChatTabs,
      focusedTabId: focusedAiChatTabId
    });
  }, [aiChatTabs, focusedAiChatTabId]);

  useEffect(() => {
    writeStoredForgeViewerTabsState({
      tabs: forgeViewerTabs,
      focusedTabId: focusedForgeViewerTabId
    });
  }, [forgeViewerTabs, focusedForgeViewerTabId]);

  const openForgeViewer = useCallback((
    projectId: string,
    kind: "pull_request" | "issue",
    number: number,
    title: string,
    repoOverride?: ForgeRepoOverride | null
  ): void => {
    setUiState((current) => {
      const existingTab = current.forgeViewerTabs.find((tab) =>
        tab.projectId === projectId
        && tab.kind === kind
        && tab.number === number
        && (tab.forgeRepoFullNameOverride ?? null) === (repoOverride?.fullName ?? null)
        && (tab.forgeRepoHostOverride ?? null) === (repoOverride?.host ?? null)
      ) ?? null;
      if (existingTab) {
        return {
          ...current,
          focusedBrowserTabId: null,
          focusedAiChatTabId: null,
          focusedForgeViewerTabId: existingTab.id
        };
      }

      const nextTab = createForgeViewerTab(projectId, kind, number, title, repoOverride);
      return {
        ...current,
        forgeViewerTabs: [...current.forgeViewerTabs, nextTab],
        focusedBrowserTabId: null,
        focusedAiChatTabId: null,
        focusedForgeViewerTabId: nextTab.id
      };
    });
    setActiveView("main");
  }, [setActiveView, setUiState]);

  const focusForgeViewerTab = useCallback((tabId: string): void => {
    setUiState((current) => ({
      ...current,
      focusedBrowserTabId: null,
      focusedAiChatTabId: null,
      focusedForgeViewerTabId: tabId
    }));
  }, [setUiState]);

  const closeForgeViewerTab = useCallback((tabId: string): void => {
    setUiState((current) => {
      const closingTab = current.forgeViewerTabs.find((tab) => tab.id === tabId) ?? null;
      const nextTabs = current.forgeViewerTabs.filter((tab) => tab.id !== tabId);
      const closingFocusedTab = current.focusedForgeViewerTabId === tabId;
      const nextFocusedForgeViewerTabId = closingFocusedTab
        ? (closingTab
            ? nextTabs.filter((tab) => tab.projectId === closingTab.projectId).at(-1)?.id ?? null
            : null)
        : current.focusedForgeViewerTabId;

      return {
        ...current,
        forgeViewerTabs: nextTabs,
        focusedForgeViewerTabId: nextFocusedForgeViewerTabId
      };
    });
  }, [setUiState]);

  const handleOpenWorkspaceBrowser = useCallback((projectId: string, url?: string): void => {
    setUiState((current) => ({ ...current, focusedForgeViewerTabId: null, focusedAiChatTabId: null }));
    openWorkspaceBrowser(projectId, url);
  }, [openWorkspaceBrowser, setUiState]);

  const openAiChat = useCallback((projectId: string): void => {
    setUiState((current) => {
      const nextTab = createAiChatTab(projectId);
      return {
        ...current,
        aiChatTabs: [...current.aiChatTabs, nextTab],
        focusedBrowserTabId: null,
        focusedForgeViewerTabId: null,
        focusedAiChatTabId: nextTab.id
      };
    });
    setActiveView("main");
  }, [setActiveView, setUiState]);

  const focusAiChatTab = useCallback((tabId: string): void => {
    setUiState((current) => ({
      ...current,
      focusedBrowserTabId: null,
      focusedForgeViewerTabId: null,
      focusedAiChatTabId: tabId
    }));
  }, [setUiState]);

  const closeAiChatTab = useCallback((tabId: string): void => {
    setUiState((current) => {
      const closingTab = current.aiChatTabs.find((tab) => tab.id === tabId) ?? null;
      const nextTabs = current.aiChatTabs.filter((tab) => tab.id !== tabId);
      const closingFocusedTab = current.focusedAiChatTabId === tabId;
      const nextFocusedAiChatTabId = closingFocusedTab
        ? (closingTab ? nextTabs.filter((tab) => tab.projectId === closingTab.projectId).at(-1)?.id ?? null : null)
        : current.focusedAiChatTabId;
      return {
        ...current,
        aiChatTabs: nextTabs,
        focusedAiChatTabId: nextFocusedAiChatTabId
      };
    });
  }, [setUiState]);

  const updateAiChatTabMessages = useCallback((tabId: string, updater: (current: AiChatMessage[]) => AiChatMessage[]): void => {
    setUiState((current) => {
      let changed = false;
      const nextTabs = current.aiChatTabs.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }
        const nextMessages = updater(tab.messages);
        if (nextMessages === tab.messages) {
          return tab;
        }
        changed = true;
        return { ...tab, messages: nextMessages };
      });
      if (!changed) {
        return current;
      }
      return {
        ...current,
        aiChatTabs: nextTabs
      };
    });
  }, [setUiState]);

  const updateAiChatTabReasoningMode = useCallback((tabId: string, mode: AiChatReasoningLevel): void => {
    setUiState((current) => {
      let changed = false;
      const nextTabs = current.aiChatTabs.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }
        if (tab.reasoningMode === mode) {
          return tab;
        }
        changed = true;
        return { ...tab, reasoningMode: mode };
      });
      if (!changed) {
        return current;
      }
      return {
        ...current,
        aiChatTabs: nextTabs
      };
    });
  }, [setUiState]);

  const updateAiChatTabTitle = useCallback((tabId: string, title: string): void => {
    const nextTitle = title.trim();
    if (nextTitle.length < 3) {
      return;
    }
    setUiState((current) => {
      let changed = false;
      const nextTabs = current.aiChatTabs.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }
        if (tab.title === nextTitle) {
          return tab;
        }
        changed = true;
        return { ...tab, title: nextTitle };
      });
      if (!changed) {
        return current;
      }
      return {
        ...current,
        aiChatTabs: nextTabs
      };
    });
  }, [setUiState]);

  const resolveGitlabForgeRepoOverride = useCallback((item: ForgeWorkItemSummary) => {
    const fullName = item.sourceRepository?.trim();
    if (!fullName) {
      return null;
    }

    const configuredHost = gitlabHost.trim();
    if (configuredHost) {
      return {
        host: configuredHost.replace(/^https?:\/\//i, "").split("/")[0] ?? configuredHost,
        fullName
      };
    }

    try {
      const host = new URL(item.webUrl).host;
      if (host) {
        return { host, fullName };
      }
    } catch {
      // Fall through to default host when URL parsing fails.
    }

    return { host: "gitlab.com", fullName };
  }, [gitlabHost]);

  return {
    openForgeViewer,
    focusForgeViewerTab,
    closeForgeViewerTab,
    handleOpenWorkspaceBrowser,
    openAiChat,
    focusAiChatTab,
    closeAiChatTab,
    updateAiChatTabMessages,
    updateAiChatTabReasoningMode,
    updateAiChatTabTitle,
    resolveGitlabForgeRepoOverride
  };
}
