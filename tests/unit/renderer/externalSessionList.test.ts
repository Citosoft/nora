import assert from "node:assert/strict";
import test from "node:test";
import { buildExternalSessionList } from "@/components/app/logic/thread-workspace/externalSessionList";
import type { ExternalSessionEntry } from "@/components/app/types/externalSessions.types";

const entries: ExternalSessionEntry[] = Array.from({ length: 9 }, (_, index) => ({ workspaceId: "workspace", workspaceName: "Project", workspacePath: "/project",
  session: { id: `session-${index}`, origin: index % 2 ? "desktop" : "cli", providerKind: index % 2 ? "claude" : "codex", instanceId: "local",
    title: `Conversation ${index}`, cwd: "/project", createdAt: "2026-11-10T00:00:00.000Z", updatedAt: `2026-11-10T0${index}:00:00.000Z` } }));

test("external threads list every match newest first across CLI and desktop without mutating discovery results", () => {
  assert.deepEqual(buildExternalSessionList({ entries, query: "" }).map((entry) => entry.session.id),
    ["session-8", "session-7", "session-6", "session-5", "session-4", "session-3", "session-2", "session-1", "session-0"]);
  assert.equal(entries[0].session.id, "session-0");
});

test("external thread search includes older sessions and supports provider and origin labels", () => {
  assert.deepEqual(buildExternalSessionList({ entries, query: "conversation 0" }).map((entry) => entry.session.id), ["session-0"]);
  const desktops = buildExternalSessionList({ entries, query: " desktop " });
  assert.equal(desktops.length, 4); assert.ok(desktops.every((entry) => entry.session.origin === "desktop"));
  assert.equal(buildExternalSessionList({ entries, query: "no match" }).length, 0);
});


test("All workspaces shows one entry per native session and attributes nested matches to the closest workspace", () => {
  const nested = { ...entries[0], workspaceId: "nested", workspaceName: "Nested", workspacePath: "/project/subdirectory" };
  const result = buildExternalSessionList({ entries: [entries[0], nested], query: "" });
  assert.equal(result.length, 1); assert.equal(result[0].workspaceId, "nested");
});

test("per-app filtering keeps an older app's chats discoverable", () => {
  const olderClaude = { ...entries[0], session: { ...entries[0].session, id: "older-claude", providerKind: "claude" as const, origin: "cli" as const } };
  const result = buildExternalSessionList({ entries: [...entries, olderClaude], query: "", sourceFilter: "claude-cli" });
  assert.deepEqual(result.map((entry) => entry.session.id), ["older-claude"]);
});
