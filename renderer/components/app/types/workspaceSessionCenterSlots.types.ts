import type { AiChatTabState, BrowserTabState, FileEditorTab, ForgeViewerTabState } from "@/components/app/types";
import type { ChangeEntry } from "@shared/appTypes";

/**
 * Normalized center-column “tab” for keep-alive stacking. IDs align with
 * workspace session tab ids where a real tab exists; synthetic surfaces use
 * the `center:*` prefix.
 */
export type WorkspaceSessionCenterSlot =
  | { id: string; kind: "diff-full"; payload: null }
  | { id: string; kind: "diff-file"; payload: { change: ChangeEntry } }
  | { id: "center:file-editor"; kind: "file-editor"; payload: null }
  | { id: "center:forge"; kind: "forge"; payload: null }
  | { id: string; kind: "ai-chat"; payload: { tab: AiChatTabState } }
  | { id: string; kind: "browser"; payload: { tab: BrowserTabState } }
  | { id: "center:agent-terminal"; kind: "agent-terminal"; payload: null };

export type BuildWorkspaceSessionCenterSlotsInput = {
  activeWorkspaceContentTab: "file" | "diff" | null;
  isDiffExpanded: boolean;
  isFullDiffExpanded: boolean;
  selectedDiffChange: ChangeEntry | null;
  fileEditorTabCount: number;
  forgeViewerTabCount: number;
  projectScopedAiChatTabs: AiChatTabState[];
  projectScopedBrowserTabs: BrowserTabState[];
};

export type ResolveActiveWorkspaceSessionCenterSlotIdInput = {
  activeWorkspaceContentTab: "file" | "diff" | null;
  isDiffExpanded: boolean;
  isFullDiffExpanded: boolean;
  selectedDiffChange: ChangeEntry | null;
  activeFileEditorTab: FileEditorTab | null;
  forgeViewerTab: ForgeViewerTabState | null;
  aiChatTab: AiChatTabState | null;
  browserTab: BrowserTabState | null;
};
