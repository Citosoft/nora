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

test("a group keeps every Nora thread and previews only its first five resumable threads, in order", () => {
  const rows = [nora("nora-1", "a"), ...resumable(["r1", "r2", "r3"], "a"), nora("nora-2", "a"), ...resumable(["r4", "r5", "r6", "r7"], "a")];
  const preview = previewThreadGroup(rows, false);
  assert.deepEqual(preview.rows.map((row) => row.id.replace(/^external:.*"(r\d)"\]$/, "$1")), ["nora-1", "r1", "r2", "r3", "nora-2", "r4", "r5"]);
  assert.equal(preview.hidden, 2); assert.equal(preview.limited, true);
  const expanded = previewThreadGroup(rows, true);
  assert.equal(expanded.rows.length, rows.length); assert.equal(expanded.hidden, 0); assert.equal(expanded.limited, true);
});

test("groups within the limit offer no Show more", () => {
  const preview = previewThreadGroup([nora("nora", "a"), ...resumable(["r1", "r2"], "a")], false);
  assert.equal(preview.limited, false); assert.equal(preview.hidden, 0); assert.equal(preview.rows.length, 3);
});

test("each workspace group limits its own resumable threads, so a busy workspace does not crowd out another", () => {
  const rows = [...resumable(["a1", "a2", "a3", "a4", "a5", "a6"], "a"), ...resumable(["b1", "b2"], "b")];
  const groups = buildThreadGroups(rows, "workspace", new Map([["a", { id: "a", name: "A" }], ["b", { id: "b", name: "B" }]]));
  const previews = groups.map((group) => previewThreadGroup(group.rows, false));
  assert.deepEqual(previews.map((preview) => [preview.rows.length, preview.hidden]), [[5, 1], [2, 0]]);
});
