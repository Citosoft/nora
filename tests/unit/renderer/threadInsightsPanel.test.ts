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
    outputs: [{ source: "workspace", key: "workspace:docs/report.pdf", kind: "document", itemId: "review", path: "docs/report.pdf", name: "report.pdf", createdAt: "2026-11-18T10:00:00.000Z" },
      { source: "tool", key: "/codex/ig_1.png", kind: "image", itemId: "image", path: "/codex/ig_1.png", name: "ig_1.png", description: "A red square", createdAt: "2026-11-18T10:00:00.000Z" }],
    branch: { request: { status: "unavailable" }, changes: { status: "unavailable" }, create: { kind: "hidden" }, diffTarget: null, refresh() {}, async createChangeRequest() {} },
    pins: { pins: [{ itemId: "answer", role: "assistant", text: "Ship on Friday after the smoke test", messageAt: "2026-11-18T10:00:00.000Z", pinnedAt: "2026-11-18T10:05:00.000Z" }],
      isPinned: () => true, toggle() {}, jumpTo() {}, seeking: null, notice: null },
    expanded: true,
    busy: false, canSettle: true, hasOlderHistory: false,
    onToggle() {}, onLoadHistory() {}, async onOpenOutput() {}, onSettleChange() {}
  }));
  assert.ok(rendered.includes("Simulator · no LLM"));
  assert.ok(rendered.includes("Review the diff") && rendered.includes("1 running"));
  assert.ok(rendered.includes("code-review") && rendered.includes("Loaded") && rendered.includes("1 available, not used"));
  assert.ok(rendered.includes("Pinned messages") && rendered.includes("Ship on Friday after the smoke test"));
  assert.ok(rendered.includes("Outputs") && rendered.includes("Document · docs/report.pdf") && rendered.includes("Generated · A red square"));
});
