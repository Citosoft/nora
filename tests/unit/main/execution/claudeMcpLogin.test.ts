import assert from "node:assert/strict";
import test from "node:test";
import { createClaudeMcp, normalizeClaudeMcp } from "@main/providers/claude/mcp";
import type { ClaudeRuntimeOptions } from "@main/types/execution/claude.types";

const runtime: ClaudeRuntimeOptions = { executablePath: "claude" };

test("Claude offers sign-in only for remote servers and claude.ai connectors that need it", () => {
  const remote = normalizeClaudeMcp({ name: "linear", status: "needs-auth", source: "user", config: { type: "http", url: "https://mcp.linear.app/mcp" } });
  assert.equal(remote.canLogin, true);
  assert.equal(remote.message, undefined);
  const connector = normalizeClaudeMcp({ name: "claude.ai Gmail", status: "needs-auth", source: "claudeai", config: { type: "claudeai-proxy", url: "https://gmail.example/mcp", id: "g" } });
  assert.equal(connector.canLogin, true);
  const local = normalizeClaudeMcp({ name: "local", status: "needs-auth", source: "project", config: { type: "stdio", command: "server" } });
  assert.equal(local.canLogin, false);
  assert.match(local.message ?? "", /not OAuth-based/);
  assert.equal(normalizeClaudeMcp({ name: "ok", status: "connected", source: "user", config: { type: "http", url: "https://ok.example/mcp" } }).canLogin, false);
});

test("an incomplete Claude sign-in reports why without re-reading servers", async () => {
  const calls: Array<[string, string]> = [];
  const mcp = createClaudeMcp(runtime, async (cwd, serverName) => { calls.push([cwd, serverName]); return false; });
  const result = await mcp("/repo", { kind: "login", serverName: "linear" });
  assert.deepEqual(calls, [["/repo", "linear"]], "sign-in runs in the thread's workspace");
  assert.equal(result.kind, "unavailable");
  assert.match(result.kind === "unavailable" ? result.message : "", /linear did not complete/);
});
