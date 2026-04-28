import { markBrowserTabLoadStopped, updateTabNavigationState } from "@/components/app/logic/browserTabNavigation";
import type { BrowserTabState } from "@/components/app/types";
import assert from "node:assert/strict";
import test from "node:test";

function createTab(overrides?: Partial<BrowserTabState>): BrowserTabState {
  return {
    id: "browser-tab",
    projectId: "project-1",
    title: "example.com",
    faviconUrl: null,
    history: ["about:blank", "https://example.com/"],
    historyIndex: 1,
    status: "starting",
    ...overrides
  };
}

test("markBrowserTabLoadStopped keeps history unchanged while marking the tab as running", () => {
  const current = createTab({
    history: ["about:blank", "https://www.google.com/", "https://www.google.com/search?q=nora"],
    historyIndex: 2,
    title: "Google Search",
    status: "starting"
  });

  const next = markBrowserTabLoadStopped(current, "Google");

  assert.equal(next.status, "running");
  assert.equal(next.title, "Google");
  assert.deepEqual(next.history, current.history);
  assert.equal(next.historyIndex, current.historyIndex);
});

test("updateTabNavigationState moves backward in history when navigation matches previous entry", () => {
  const current = createTab({
    history: ["https://a.test/", "https://b.test/"],
    historyIndex: 1
  });

  const next = updateTabNavigationState(current, "https://a.test/", "running");

  assert.equal(next.historyIndex, 0);
  assert.deepEqual(next.history, ["https://a.test/", "https://b.test/"]);
});
