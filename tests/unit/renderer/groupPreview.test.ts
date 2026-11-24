import assert from "node:assert/strict";
import test from "node:test";
import { buildResumableThreadRows } from "@/components/app/logic/thread-workspace/listRows";
import { buildThreadGroups } from "@/components/app/logic/thread-workspace/groups";
import { previewThreadGroup } from "@/components/app/logic/thread-workspace/groupPreview";
import type { ExternalSessionEntry } from "@/components/app/types/externalSessions.types";
import type { ThreadListRow } from "@/components/app/types/thread-workspace/list.types";

const entry = (id: string, workspaceId: string, hour: number): ExternalSessionEntry => ({ workspaceId, workspaceName: workspaceId, workspacePath: `/${workspaceId}`,
  session: { id, title: id, providerKind: "codex", instanceId: "local", origin: "cli", cwd: `/${workspaceId}`,
    createdAt: "2026-11-10T00:00:00.000Z", updatedAt: `2026-11-10T${String(hour).padStart(2, "0")}:00:00.000Z` } });
const resumable = (ids: readonly string[], workspaceId: string): ThreadListRow[] =>
  buildResumableThreadRows(ids.map((id, index) => entry(id, workspaceId, 20 - index)), null);
const nora = (id: string, workspaceId: string): ThreadListRow => ({ ...resumable([id], workspaceId)[0], id, target: { kind: "thread", conversationId: id } });

const ids = (prefix: string, count: number): string[] => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);

test("a group previews its first ten threads across sources in order and expands to show all", () => {
  const rows = [nora("nora-1", "a"), ...resumable(ids("r", 7), "a"), nora("nora-2", "a"),
    { ...nora("draft", "a"), target: { kind: "draft", documentId: "draft" } } satisfies ThreadListRow,
    ...resumable(["r8", "r9"], "a"), nora("nora-3", "a")];
  const preview = previewThreadGroup(rows, false);
  assert.deepEqual(preview.rows, rows.slice(0, 10));
  assert.equal(preview.hidden, 3);
  assert.equal(preview.limited, true);
  const expanded = previewThreadGroup(rows, true);
  assert.deepEqual(expanded.rows, rows);
  assert.equal(expanded.hidden, 0);
  assert.equal(expanded.limited, true);
  assert.deepEqual(previewThreadGroup(rows, false), preview);
});

test("Nora-only groups also stop at ten threads", () => {
  const rows = ids("nora", 11).map((id) => nora(id, "a"));
  const preview = previewThreadGroup(rows, false);
  assert.deepEqual(preview.rows, rows.slice(0, 10));
  assert.equal(preview.hidden, 1);
  assert.equal(preview.limited, true);
});

test("empty lists and groups up to ten threads offer no Show more", () => {
  for (const count of [0, 3, 10]) {
    const rows = resumable(ids("r", count), "a");
    for (const expanded of [false, true]) {
      assert.deepEqual(previewThreadGroup(rows, expanded), { rows, hidden: 0, limited: false });
    }
  }
});

test("each workspace group limits its own threads independently", () => {
  const rows = [...resumable(ids("a", 12), "a"), ...resumable(["b1", "b2"], "b")];
  const groups = buildThreadGroups(rows, "workspace", new Map([["a", { id: "a", name: "A" }], ["b", { id: "b", name: "B" }]]));
  const previews = groups.map((group) => previewThreadGroup(group.rows, false));
  assert.deepEqual(previews.map((preview) => [preview.rows.length, preview.hidden]), [[10, 2], [2, 0]]);
  assert.deepEqual(previewThreadGroup(groups[0].rows, true).rows, groups[0].rows);
  assert.deepEqual(previewThreadGroup(groups[1].rows, false), previews[1]);
});

test("ungrouped threads share a single ten-thread preview", () => {
  const rows = [...resumable(ids("a", 8), "a"), ...ids("b", 7).map((id) => nora(id, "b"))];
  const groups = buildThreadGroups(rows, "none", new Map());
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, null);
  const preview = previewThreadGroup(groups[0].rows, false);
  assert.deepEqual(preview.rows, rows.slice(0, 10));
  assert.equal(preview.hidden, 5);
  assert.equal(preview.limited, true);
});
