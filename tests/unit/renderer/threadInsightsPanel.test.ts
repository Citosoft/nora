import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThreadInsightsPanel } from "@/components/app/panels/conversations/ThreadInsightsPanel";
import { threadSummary } from "./threadWorkspaceFixtures";

test("thread details mount in the standalone simulator without the signed-in shell runtime", () => {
  const rendered = renderToStaticMarkup(createElement(ThreadInsightsPanel, {
    header: { schemaVersion: 1, cursor: 0, conversation: threadSummary().conversation,
      activeRuns: [], queuedRuns: [], pendingRequests: [] },
    providerLabel: "Simulator · no LLM", changes: { status: "pending" }, request: { status: "unavailable" }, expanded: true,
    busy: false, canSettle: true, hasOlderHistory: false,
    onToggle() {}, onRefresh() {}, onLoadHistory() {}, onSettleChange() {}
  }));
  assert.ok(rendered.includes("Simulator · no LLM"));
});
