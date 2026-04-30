import { getFileEditorLeafName } from "@/components/app/logic/fileEditorPath";
import type { FileEditorState, FileEditorTab } from "@/components/app/types";

export function findFileEditorTab(state: FileEditorState | null, pathName: string): FileEditorTab | null {
  return state?.tabs.find((tab) => tab.path === pathName) ?? null;
}

export function isDirtyFileEditorTab(tab: FileEditorTab): boolean {
  return tab.kind === "text" && tab.content !== tab.savedContent;
}

export function buildCloseDirtyFileEditorTabMessage(tab: FileEditorTab): string | null {
  if (!isDirtyFileEditorTab(tab)) {
    return null;
  }

  return `Discard unsaved changes to "${getFileEditorLeafName(tab.path)}"?`;
}

export function closeFileEditorTab(state: FileEditorState | null, pathName: string): FileEditorState | null {
  if (!state) {
    return state;
  }

  const nextTabs = state.tabs.filter((tab) => tab.path !== pathName);
  if (nextTabs.length === state.tabs.length) {
    return state;
  }
  if (nextTabs.length === 0) {
    return null;
  }

  const closedIndex = state.tabs.findIndex((tab) => tab.path === pathName);
  const fallbackTab = nextTabs[Math.max(0, Math.min(closedIndex, nextTabs.length - 1))];
  return {
    activePath: state.activePath === pathName ? fallbackTab.path : state.activePath,
    tabs: nextTabs
  };
}
