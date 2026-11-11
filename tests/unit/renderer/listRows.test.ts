import assert from "node:assert/strict";
import test from "node:test";
import { buildResumableThreadRows, mergeThreadRows } from "@/components/app/logic/thread-workspace/listRows";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import type { ExternalSessionEntry } from "@/components/app/types/externalSessions.types";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";

const entries: ExternalSessionEntry[] = [{ workspaceId: "personal", workspaceName: "Personal", workspacePath: "/personal", session: {
  id: "native-other", title: "Another chat", providerKind: "codex", instanceId: "account", origin: "desktop", cwd: "/personal",
  createdAt: "2026-11-08T10:00:00.000Z", updatedAt: "2026-11-10T10:00:00.000Z"
} }];

test("resumable conversations merge chronologically with normal threads and preserve pinned order", () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const stored = buildThreadNavigation({ ...store.snapshot(), summaries: f.summaries }, null, "all");
  const external = buildResumableThreadRows(entries, null);
  const merged = mergeThreadRows(stored, external, "all");
  assert.equal(merged[0].title, "Another chat");
  assert.equal(merged[0].target.kind, "external");
  const pinned = mergeThreadRows(stored.map((row) => ({ ...row, pinned: true })), external, "all");
  assert.equal(pinned[0].target.kind, "thread");
  assert.equal(stored[0].pinned, false);
});

test("source filters include previously imported conversations and keep unimported chats out of the Nora view", () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const local = buildThreadNavigation({ ...store.snapshot(), summaries: f.summaries }, null, "all");
  const imported = { ...local[0], id: "imported", origin: "cli" as const };
  const external = buildResumableThreadRows(entries, null);
  assert.deepEqual(mergeThreadRows([...local, imported], external, "nora").map((row) => row.id), [local[0].id]);
  const others = mergeThreadRows([...local, imported], external, "external");
  assert.equal(others.length, 2); assert.ok(others.every((row) => row.origin));
  assert.equal(mergeThreadRows([...local, imported], external, "all").length, 3);
});

test("per-app filters distinguish provider and source for stored and resumable threads", () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const rows = buildThreadNavigation({ ...store.snapshot(), summaries: f.summaries }, null, "all");
  const imported = { ...rows[0], id: "imported-cli", providerKind: "codex" as const, origin: "cli" as const };
  const external = buildResumableThreadRows(entries, null);
  assert.deepEqual(mergeThreadRows([...rows, imported], external, "codex-cli").map((row) => row.id), ["imported-cli"]);
  assert.equal(mergeThreadRows([...rows, imported], external, "codex-desktop").length, 1);
  assert.equal(mergeThreadRows([...rows, imported], external, "claude-desktop").length, 0);
});
