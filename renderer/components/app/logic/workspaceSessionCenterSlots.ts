import { getDiffWorkspaceSessionTabId } from "@/components/app/logic/workspaceSessionTabs";
import type {
  BuildWorkspaceSessionCenterSlotsInput,
  ResolveActiveWorkspaceSessionCenterSlotIdInput,
  WorkspaceSessionCenterSlot
} from "@/components/app/types/workspaceSessionCenterSlots.types";

export function buildWorkspaceSessionCenterSlots(
  input: BuildWorkspaceSessionCenterSlotsInput
): WorkspaceSessionCenterSlot[] {
  const slots: WorkspaceSessionCenterSlot[] = [];

  const mountFullDiff =
    input.activeWorkspaceContentTab === "diff" && input.isDiffExpanded && input.isFullDiffExpanded;
  if (mountFullDiff) {
    slots.push({
      id: getDiffWorkspaceSessionTabId("__all_changes__"),
      kind: "diff-full",
      payload: null
    });
  }

  const mountDiffFile =
    input.activeWorkspaceContentTab === "diff" &&
    input.isDiffExpanded &&
    !input.isFullDiffExpanded &&
    Boolean(input.selectedDiffChange);
  if (mountDiffFile && input.selectedDiffChange) {
    const change = input.selectedDiffChange;
    slots.push({
      id: getDiffWorkspaceSessionTabId(change.path),
      kind: "diff-file",
      payload: { change }
    });
  }

  if (input.fileEditorTabCount > 0) {
    slots.push({ id: "center:file-editor", kind: "file-editor", payload: null });
  }

  if (input.forgeViewerTabCount > 0) {
    slots.push({ id: "center:forge", kind: "forge", payload: null });
  }

  for (const tab of input.projectScopedAiChatTabs) {
    slots.push({ id: tab.id, kind: "ai-chat", payload: { tab } });
  }

  for (const tab of input.projectScopedBrowserTabs) {
    slots.push({ id: tab.id, kind: "browser", payload: { tab } });
  }

  slots.push({ id: "center:agent-terminal", kind: "agent-terminal", payload: null });

  return slots;
}

export function resolveActiveWorkspaceSessionCenterSlotId(
  input: ResolveActiveWorkspaceSessionCenterSlotIdInput
): string {
  const mountFullDiff =
    input.activeWorkspaceContentTab === "diff" && input.isDiffExpanded && input.isFullDiffExpanded;
  if (mountFullDiff) {
    return getDiffWorkspaceSessionTabId("__all_changes__");
  }

  const mountDiffFile =
    input.activeWorkspaceContentTab === "diff" &&
    input.isDiffExpanded &&
    !input.isFullDiffExpanded &&
    Boolean(input.selectedDiffChange);
  if (mountDiffFile && input.selectedDiffChange) {
    return getDiffWorkspaceSessionTabId(input.selectedDiffChange.path);
  }

  if (input.activeWorkspaceContentTab === "file" && input.activeFileEditorTab) {
    return "center:file-editor";
  }

  if (input.forgeViewerTab) {
    return "center:forge";
  }

  if (input.aiChatTab) {
    return input.aiChatTab.id;
  }

  if (input.browserTab) {
    return input.browserTab.id;
  }

  return "center:agent-terminal";
}
