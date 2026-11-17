import assert from "node:assert/strict";
import test from "node:test";
import { availableThreadGroupings, buildThreadGroups, resolveThreadGrouping } from "@/components/app/logic/thread-workspace/groups";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

function row(id: string, workspaceId: string, overrides: Partial<ThreadNavigationRow> = {}): ThreadNavigationRow {
  return {
    id, workspaceId, title: id, target: { kind: "thread", conversationId: id }, providerKind: null,
    status: "Ready", active: false, working: false, unread: false, attention: false, pinned: false,
    selected: false, hasDraft: false, queuedCount: 0, updatedAt: "2026-11-11T10:00:00Z", ...overrides
  };
}
const workspaces = new Map([
  ["native-a", { id: "shell-a", name: "Alpha" }],
  ["native-b", { id: "shell-b", name: "Beta" }],
  ["native-c", { id: "shell-c", name: "Alpha" }]
]);

test("flat grouping preserves recent and pinned order without mutating input", () => {
  const rows = [row("pin", "native-b", { pinned: true }), row("new", "native-a"), row("old", "native-b")];
  const copy = structuredClone(rows);
  const groups = buildThreadGroups(rows, "none", workspaces);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, null);
  assert.deepEqual(groups[0].rows, rows);
  assert.deepEqual(rows, copy);
  assert.deepEqual(buildThreadGroups([], "workspace", workspaces), []);
});

test("workspace grouping keeps pins first and groups identities independently of duplicate names", () => {
  const rows = [row("pin", "native-b", { pinned: true }), row("b-new", "native-b"), row("a", "native-a"),
    row("b-old", "native-b"), row("c", "native-c"), row("missing", "removed")];
  const groups = buildThreadGroups(rows, "workspace", workspaces);
  assert.deepEqual(groups.map((group) => group.label), ["Pinned", "Alpha", "Alpha", "Beta", "Unavailable workspace"]);
  assert.deepEqual(groups[1].workspace, { id: "shell-a", name: "Alpha" });
  assert.deepEqual(groups[3].rows.map((entry) => entry.id), ["b-new", "b-old"]);
  assert.deepEqual(groups.flatMap((group) => group.rows.map((entry) => entry.id)).sort(), rows.map((entry) => entry.id).sort());
  assert.equal(groups.at(-1)?.workspace?.id, "removed");
});

test("activity grouping prioritizes pending input, failures and unread completions over running state", () => {
  const rows = [row("pin", "native-b", { pinned: true, active: true }),
    row("approval", "native-a", { attention: true, active: true, status: "Needs approval" }),
    row("unread", "native-a", { unread: true, status: "Completed" }),
    row("failure", "native-b", { attention: true, status: "Failed" }),
    row("working", "native-b", { active: true, working: true, status: "Working" }),
    row("queued", "native-b", { active: true, queuedCount: 2, status: "Queued" }),
    row("draft", "native-a", { target: { kind: "draft", documentId: "draft" }, hasDraft: true, status: "Draft" }),
    row("idle", "native-a")];
  const groups = buildThreadGroups(rows, "activity", workspaces);
  assert.deepEqual(groups.map((group) => [group.label, group.rows.map((entry) => entry.id)]), [
    ["Pinned", ["pin"]], ["Needs attention", ["approval", "unread", "failure"]],
    ["In progress", ["working", "queued"]], ["Drafts", ["draft"]], ["Other threads", ["idle"]]
  ]);
});

test("grouping uses only supplied search and filter results and omits empty groups", () => {
  const filtered = [row("matching", "native-b", { active: true })];
  assert.deepEqual(buildThreadGroups(filtered, "workspace", workspaces).map((group) => group.label), ["Beta"]);
  assert.deepEqual(buildThreadGroups(filtered, "activity", workspaces).map((group) => group.label), ["In progress"]);
});

test("workspace grouping is available only across all workspaces", () => {
  assert.deepEqual(availableThreadGroupings(false).map((entry) => entry.id), ["none", "activity", "source", "provider"]);
  assert.deepEqual(availableThreadGroupings(true).map((entry) => entry.id), ["none", "workspace", "activity", "source", "provider"]);
});

test("single-workspace scope suppresses saved workspace grouping and restores it across all workspaces", () => {
  const saved = "workspace";
  assert.equal(resolveThreadGrouping(saved, false), "none");
  assert.equal(resolveThreadGrouping(saved, true), "workspace");
  for (const grouping of ["none", "activity", "source", "provider"] as const) {
    assert.equal(resolveThreadGrouping(grouping, false), grouping);
    assert.equal(resolveThreadGrouping(grouping, true), grouping);
  }
});

test("source grouping separates actual apps while keeping source badges out of row data", () => {
  const rows = [row("pin", "native-a", { pinned: true, origin: "desktop" }), row("local", "native-a"),
    row("cli", "native-a", { origin: "cli", providerKind: "codex" }), row("desktop", "native-a", { origin: "desktop", providerKind: "claude" })];
  const groups = buildThreadGroups(rows, "source", workspaces);
  assert.deepEqual(groups.map((group) => [group.label, group.rows.map((entry) => entry.id)]), [
    ["Pinned", ["pin"]], ["Nora", ["local"]], ["Codex CLI", ["cli"]], ["Claude Desktop", ["desktop"]]
  ]);
});

test("provider grouping combines Nora and resumable chats, preserves pins, and handles unbound drafts", () => {
  const rows = [row("pin", "native-a", { pinned: true, providerKind: "codex" }),
    row("codex", "native-a", { providerKind: "codex" }), row("imported", "native-b", { providerKind: "codex", origin: "desktop" }),
    row("claude", "native-a", { providerKind: "claude", origin: "cli" }), row("draft", "native-a")];
  const groups = buildThreadGroups(rows, "provider", workspaces, new Map([["codex", "Codex"], ["claude", "Claude"]]));
  assert.deepEqual(groups.map((group) => [group.label, group.rows.map((entry) => entry.id)]), [
    ["Pinned", ["pin"]], ["Claude", ["claude"]], ["Codex", ["codex", "imported"]], ["No provider", ["draft"]]
  ]);
  assert.equal(groups[1].providerKind, "claude");
});
