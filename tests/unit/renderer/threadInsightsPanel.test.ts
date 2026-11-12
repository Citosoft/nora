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
    providerLabel: "Simulator · no LLM", connectors: null,
    skills: { refresh() {}, summary: { catalog: { status: "ready", skills: [{ name: "release-notes", description: "Draft release notes", scope: "workspace" }] },
      used: [{ name: "code-review", evidence: "loaded", agents: [], calls: [] }], available: [{ name: "release-notes", description: "Draft release notes", scope: "workspace" }] } }, changes: { status: "pending" },
    subagents: { running: 1, agents: [{ nativeId: "agent", label: "Review the diff", state: "running", progress: "Reading files", startedAt: "2026-01-01T00:00:00.000Z", activity: [] }] },
    request: { status: "unavailable" }, expanded: true,
    busy: false, canSettle: true, hasOlderHistory: false,
    onToggle() {}, onRefresh() {}, onLoadHistory() {}, onSettleChange() {}
  }));
  assert.ok(rendered.includes("Simulator · no LLM"));
  assert.ok(rendered.includes("Review the diff") && rendered.includes("1 running"));
  assert.ok(rendered.includes("code-review") && rendered.includes("Loaded") && rendered.includes("1 available, not used"));
});
