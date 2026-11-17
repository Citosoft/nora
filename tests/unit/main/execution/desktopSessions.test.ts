import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClaudeExternalSessions } from "@main/providers/claude/externalSessions";
import { codexSessionOrigin } from "@main/providers/codex/sessionOrigin";
import type { ClaudeHistoryApi } from "@main/types/execution/externalSessions.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";

const workspace: WorkspaceRef = { projectId: "project", environmentId: "local", checkoutId: "checkout", path: "/project", branch: "main", access: "write" };

test("Claude Desktop metadata maps to native IDs, deduplicates CLI entries, and excludes archived, cloud, malformed and missing transcripts", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nora-desktop-sessions-")); t.after(() => rm(root, { recursive: true, force: true }));
  const index = join(root, "desktop", "account", "organization"); await mkdir(index, { recursive: true });
  const nativeId = randomUUID(); const archivedId = randomUUID(); const missingId = randomUUID(); const otherId = randomUUID();
  const cwd = join(root, "project"); await mkdir(cwd);
  const base = { sessionId: `local_${randomUUID()}`, cliSessionId: nativeId, cwd, title: "Desktop title", createdAt: 1794304800000, lastActivityAt: 1794304860000, isArchived: false };
  for (const [name, entry] of Object.entries({
    "local_valid.json": base,
    "local_duplicate.json": { ...base, sessionId: `local_${randomUUID()}` },
    "local_archived.json": { ...base, cliSessionId: archivedId, isArchived: true },
    "local_missing.json": { ...base, cliSessionId: missingId },
    "remote_cloud.json": { ...base, cliSessionId: otherId, sessionId: `remote_${randomUUID()}` },
    "local_invalid.json": { cwd }
  })) await writeFile(join(index, name), JSON.stringify(entry));
  await writeFile(join(index, "local_partial.json"), "{");
  const info = (sessionId: string) => ({ sessionId, cwd, summary: "SDK title", lastModified: base.createdAt });
  const api: ClaudeHistoryApi = {
    async listSessions() { return [info(nativeId), info(archivedId)]; },
    async getSessionInfo(id) { return id === nativeId || id === archivedId ? info(id) : undefined; },
    async getSessionMessages(id) { return [{ type: "user", uuid: randomUUID(), session_id: id, message: { content: "Desktop instruction" }, parent_tool_use_id: null, parent_agent_id: null }]; }
  };
  const reader = createClaudeExternalSessions("local", api, join(root, "desktop"));
  const sessions = await reader.list({ ...workspace, path: cwd });
  assert.equal(sessions.length, 1); assert.equal(sessions[0].id, nativeId); assert.equal(sessions[0].origin, "desktop");
  assert.equal(sessions[0].title, "Desktop title"); assert.equal(sessions[0].updatedAt, new Date(base.lastActivityAt).toISOString());
  const transcript = await reader.read({ ...workspace, path: cwd }, nativeId);
  assert.equal(transcript.session.id, nativeId); assert.equal(transcript.session.origin, "desktop");
  assert.equal(transcript.turns[0].instruction, "Desktop instruction");
  await assert.rejects(reader.read({ ...workspace, path: cwd }, archivedId), /archived/);
  assert.deepEqual(await reader.list({ ...workspace, path: root + "-missing" }), []);
});

test("Codex identifies CLI and app-server sessions and recognizes desktop sessions stored with an IDE source", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nora-codex-origin-")); t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "session.jsonl");
  await writeFile(path, JSON.stringify({ type: "session_meta", payload: { originator: "Codex Desktop" } }) + "\n");
  assert.equal(await codexSessionOrigin({ source: "cli" }), "cli");
  assert.equal(await codexSessionOrigin({ source: "cli", originator: null }), "cli");
  assert.equal(await codexSessionOrigin({ source: "appServer", originator: null }), "desktop");
  assert.equal(await codexSessionOrigin({ source: "appServer" }), "desktop");
  assert.equal(await codexSessionOrigin({ source: "vscode", path }), "desktop");
  assert.equal(await codexSessionOrigin({ source: "cli", path }), "desktop");
  assert.equal(await codexSessionOrigin({ source: "vscode", originator: "Codex Desktop" }), "desktop");
  await writeFile(path, JSON.stringify({ type: "session_meta", payload: { originator: "codex_vscode" } }) + "\n");
  assert.equal(await codexSessionOrigin({ source: "vscode", path }), null);
  assert.equal(await codexSessionOrigin({ source: "exec" }), null);
  assert.equal(await codexSessionOrigin({ source: "cli", path: join(root, "missing") }), "cli");
});
