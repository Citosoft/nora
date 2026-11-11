import assert from "node:assert/strict";
import test from "node:test";
import { buildExternalSessionList } from "@/components/app/logic/thread-workspace/externalSessionList";
import type { ExternalSessionEntry } from "@/components/app/types/externalSessions.types";

const entries: ExternalSessionEntry[] = Array.from({ length: 9 }, (_, index) => ({ workspaceId: "workspace", workspaceName: "Project", workspacePath: "/project",
  session: { id: `session-${index}`, origin: index % 2 ? "desktop" : "cli", providerKind: index % 2 ? "claude" : "codex", instanceId: "local",
    title: `Conversation ${index}`, cwd: "/project", createdAt: "2026-11-10T00:00:00.000Z", updatedAt: `2026-11-10T0${index}:00:00.000Z` } }));

test("external thread previews show the five most recent across CLI and desktop without mutating discovery results", () => {
  const preview = buildExternalSessionList({ entries, query: "", expanded: false });
  assert.deepEqual(preview.visible.map((entry) => entry.session.id), ["session-8", "session-7", "session-6", "session-5", "session-4"]);
  assert.equal(preview.total, 9); assert.equal(preview.hidden, 4);
  assert.equal(entries[0].session.id, "session-0");
});

test("Show more reveals all older sessions and Show less restores the five-thread preview", () => {
  const expanded = buildExternalSessionList({ entries, query: "", expanded: true });
  assert.equal(expanded.visible.length, 9); assert.equal(expanded.hidden, 0);
  assert.equal(buildExternalSessionList({ entries, query: "", expanded: false }).visible.length, 5);
  assert.equal(buildExternalSessionList({ entries: entries.slice(0, 3), query: "", expanded: false }).hidden, 0);
});

test("external thread search includes older sessions outside the preview and supports provider and origin labels", () => {
  assert.deepEqual(buildExternalSessionList({ entries, query: "conversation 0", expanded: false }).visible.map((entry) => entry.session.id), ["session-0"]);
  const desktops = buildExternalSessionList({ entries, query: " desktop ", expanded: false });
  assert.equal(desktops.total, 4); assert.ok(desktops.visible.every((entry) => entry.session.origin === "desktop"));
  assert.equal(buildExternalSessionList({ entries, query: "no match", expanded: true }).total, 0);
});


test("All workspaces shows one entry per native session and attributes nested matches to the closest workspace", () => {
  const nested = { ...entries[0], workspaceId: "nested", workspaceName: "Nested", workspacePath: "/project/subdirectory" };
  const result = buildExternalSessionList({ entries: [entries[0], nested], query: "", expanded: false });
  assert.equal(result.total, 1); assert.equal(result.visible[0].workspaceId, "nested");
});

test("per-app filtering runs before the preview limit so an older app's chats remain discoverable", () => {
  const olderClaude = { ...entries[0], session: { ...entries[0].session, id: "older-claude", providerKind: "claude" as const, origin: "cli" as const } };
  const result = buildExternalSessionList({ entries: [...entries, olderClaude], query: "", expanded: false, sourceFilter: "claude-cli" });
  assert.equal(result.total, 1); assert.equal(result.hidden, 0);
  assert.equal(result.visible[0].session.id, "older-claude");
});
