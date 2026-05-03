import {
  buildWorkspaceSessionCenterSlots,
  resolveActiveWorkspaceSessionCenterSlotId
} from "@/components/app/logic/workspaceSessionCenterSlots";
import { getDiffWorkspaceSessionTabId } from "@/components/app/logic/workspaceSessionTabs";
import type { AiChatTabState, BrowserTabState, FileEditorTab, ForgeViewerTabState } from "@/components/app/types";
import type { ChangeEntry } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const sampleChange: ChangeEntry = {
  path: "src/readme.md",
  status: "modified",
  additions: 1,
  deletions: 0,
  diff: ""
};

const sampleFileTab: FileEditorTab = {
  projectId: "p1",
  path: "src/readme.md",
  rootPath: null,
  kind: "text",
  content: "",
  savedContent: "",
  imageDataUrl: null,
  imageMimeType: null,
  isLoading: false,
  isSaving: false,
  errorMessage: null
};

const sampleBrowser: BrowserTabState = {
  id: "browser-1",
  projectId: "p1",
  title: "Example",
  history: ["https://example.com"],
  historyIndex: 0,
  faviconUrl: null,
  status: "running"
};

const sampleAiChat: AiChatTabState = {
  id: "chat-1",
  projectId: "p1",
  title: "Chat",
  messages: [],
  reasoningMode: "off"
};

const sampleForgeTab: ForgeViewerTabState = {
  id: "forge-1",
  projectId: "p1",
  kind: "pull_request",
  number: 1,
  title: "PR",
  forgeRepoHostOverride: null,
  forgeRepoFullNameOverride: null
};

test("buildWorkspaceSessionCenterSlots orders synthetic and keyed slots", () => {
  const slots = buildWorkspaceSessionCenterSlots({
    activeWorkspaceContentTab: "diff",
    isDiffExpanded: true,
    isFullDiffExpanded: false,
    selectedDiffChange: sampleChange,
    fileEditorTabCount: 1,
    forgeViewerTabCount: 1,
    projectScopedAiChatTabs: [sampleAiChat],
    projectScopedBrowserTabs: [sampleBrowser]
  });
  const kinds = slots.map((s) => s.kind);
  assert.ok(kinds.includes("diff-file"));
  assert.ok(kinds.includes("file-editor"));
  assert.ok(kinds.includes("forge"));
  assert.ok(kinds.includes("ai-chat"));
  assert.ok(kinds.includes("browser"));
  assert.equal(slots.find((s) => s.kind === "agent-terminal")?.id, "center:agent-terminal");
});

test("resolveActiveWorkspaceSessionCenterSlotId prefers full diff over other surfaces", () => {
  const id = resolveActiveWorkspaceSessionCenterSlotId({
    activeWorkspaceContentTab: "diff",
    isDiffExpanded: true,
    isFullDiffExpanded: true,
    selectedDiffChange: sampleChange,
    activeFileEditorTab: sampleFileTab,
    forgeViewerTab: sampleForgeTab,
    aiChatTab: sampleAiChat,
    browserTab: sampleBrowser
  });
  assert.equal(id, getDiffWorkspaceSessionTabId("__all_changes__"));
});

test("resolveActiveWorkspaceSessionCenterSlotId returns browser when focused", () => {
  const id = resolveActiveWorkspaceSessionCenterSlotId({
    activeWorkspaceContentTab: null,
    isDiffExpanded: false,
    isFullDiffExpanded: false,
    selectedDiffChange: null,
    activeFileEditorTab: null,
    forgeViewerTab: null,
    aiChatTab: null,
    browserTab: sampleBrowser
  });
  assert.equal(id, "browser-1");
});

test("resolveActiveWorkspaceSessionCenterSlotId returns file editor surface when file tab is active", () => {
  const id = resolveActiveWorkspaceSessionCenterSlotId({
    activeWorkspaceContentTab: "file",
    isDiffExpanded: false,
    isFullDiffExpanded: false,
    selectedDiffChange: null,
    activeFileEditorTab: sampleFileTab,
    forgeViewerTab: null,
    aiChatTab: null,
    browserTab: null
  });
  assert.equal(id, "center:file-editor");
});
