import type { AiChatMessage, AiChatReasoningLevel, AppView, UiState } from "@/components/app/types";
import type { ForgeWorkItemSummary } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type ForgeRepoOverride = {
  host: string;
  fullName: string;
};

export type UseAppCenterTabsArgs = {
  aiChatTabs: UiState["aiChatTabs"];
  focusedAiChatTabId: UiState["focusedAiChatTabId"];
  forgeViewerTabs: UiState["forgeViewerTabs"];
  focusedForgeViewerTabId: UiState["focusedForgeViewerTabId"];
  setUiState: Dispatch<SetStateAction<UiState>>;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  openWorkspaceBrowser: (projectId: string, url?: string) => void;
  gitlabHost: string;
};

export type UseAppCenterTabsResult = {
  openForgeViewer: (
    projectId: string,
    kind: "pull_request" | "issue" | "workflow_run",
    number: number,
    title: string,
    repoOverride?: ForgeRepoOverride | null
  ) => void;
  focusForgeViewerTab: (tabId: string) => void;
  closeForgeViewerTab: (tabId: string) => void;
  handleOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  openAiChat: (projectId: string) => void;
  focusAiChatTab: (tabId: string) => void;
  closeAiChatTab: (tabId: string) => void;
  updateAiChatTabMessages: (tabId: string, updater: (current: AiChatMessage[]) => AiChatMessage[]) => void;
  updateAiChatTabReasoningMode: (tabId: string, mode: AiChatReasoningLevel) => void;
  updateAiChatTabTitle: (tabId: string, title: string) => void;
  resolveGitlabForgeRepoOverride: (item: ForgeWorkItemSummary) => ForgeRepoOverride | null;
};
