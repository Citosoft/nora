import { getWorkspaceSessionTabsToClose, isDirectionalClosableWorkspaceSessionTab } from "@/components/app/logic/workspaceSessionTabContextActions";
import { getWorkspaceSessionTabId, getWorkspaceSessionTabToFocusAfterClose } from "@/components/app/logic/workspaceSessionTabs";
import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";
import assert from "node:assert/strict";
import test from "node:test";

const AGENT_TAB: WorkspaceSessionTab = {
  id: "agent-1",
  kind: "agent",
  name: "Agent 1",
  toolId: "codex",
  toolLabel: "Codex",
  status: "running",
  isBusy: false,
  busyUntil: null
};

const TERMINAL_TAB: WorkspaceSessionTab = {
  id: "terminal-1",
  kind: "terminal",
  name: "Terminal 1",
  status: "running"
};

const BROWSER_TAB: WorkspaceSessionTab = {
  id: "browser-1",
  kind: "browser",
  name: "Browser",
  status: "running",
  faviconUrl: null
};

const FILE_TAB: WorkspaceSessionTab = {
  id: "file:/repo/src/app.ts",
  kind: "file",
  path: "/repo/src/app.ts",
  name: "app.ts",
  status: "starting"
};

const tabs: WorkspaceSessionTab[] = [AGENT_TAB, TERMINAL_TAB, BROWSER_TAB, FILE_TAB];

test("isDirectionalClosableWorkspaceSessionTab excludes agent tabs only", () => {
  assert.equal(isDirectionalClosableWorkspaceSessionTab(AGENT_TAB), false);
  assert.equal(isDirectionalClosableWorkspaceSessionTab(TERMINAL_TAB), true);
  assert.equal(isDirectionalClosableWorkspaceSessionTab(BROWSER_TAB), true);
  assert.equal(isDirectionalClosableWorkspaceSessionTab(FILE_TAB), true);
});

test("getWorkspaceSessionTabsToClose returns anchor tab for close action", () => {
  const targets = getWorkspaceSessionTabsToClose(tabs, BROWSER_TAB, "close");
  assert.deepEqual(targets, [BROWSER_TAB]);
});

test("getWorkspaceSessionTabsToClose returns every tab except the anchor for close-others action", () => {
  const targets = getWorkspaceSessionTabsToClose(tabs, TERMINAL_TAB, "close-others");
  assert.deepEqual(targets, [AGENT_TAB, BROWSER_TAB, FILE_TAB]);
});

test("getWorkspaceSessionTabsToClose includes terminals for close-others action", () => {
  const targets = getWorkspaceSessionTabsToClose(tabs, BROWSER_TAB, "close-others");
  assert.deepEqual(targets, [AGENT_TAB, TERMINAL_TAB, FILE_TAB]);
});

test("getWorkspaceSessionTabsToClose returns only non-agent tabs on the right", () => {
  const targets = getWorkspaceSessionTabsToClose(tabs, AGENT_TAB, "close-right");
  assert.deepEqual(targets, [TERMINAL_TAB, BROWSER_TAB, FILE_TAB]);
});

test("getWorkspaceSessionTabsToClose returns only non-agent tabs on the left", () => {
  const targets = getWorkspaceSessionTabsToClose(tabs, FILE_TAB, "close-left");
  assert.deepEqual(targets, [TERMINAL_TAB, BROWSER_TAB]);
});

test("getWorkspaceSessionTabToFocusAfterClose prefers the tab to the right", () => {
  const next = getWorkspaceSessionTabToFocusAfterClose(tabs, getWorkspaceSessionTabId(TERMINAL_TAB));
  assert.equal(next, BROWSER_TAB);
});

test("getWorkspaceSessionTabToFocusAfterClose falls back to the left when closing the last tab", () => {
  const next = getWorkspaceSessionTabToFocusAfterClose(tabs, getWorkspaceSessionTabId(FILE_TAB));
  assert.equal(next, BROWSER_TAB);
});

test("getWorkspaceSessionTabToFocusAfterClose returns null for a single tab", () => {
  const next = getWorkspaceSessionTabToFocusAfterClose([AGENT_TAB], getWorkspaceSessionTabId(AGENT_TAB));
  assert.equal(next, null);
});
