import assert from "node:assert/strict";
import test from "node:test";
import { listMcpServerRows } from "@/components/app/logic/mcpServerTable";
import type { McpProviderSource } from "@/components/app/types/runtimeMcp.types";
import type { McpServer } from "@shared/types/provider/mcp.types";

const source = (kind: McpProviderSource["kind"], label: string): McpProviderSource =>
  ({ key: kind, label, kind, selection: { environmentId: "env", providerKind: kind, instanceId: kind } });
const server = (name: string, scope: McpServer["scope"]): McpServer =>
  ({ name, scope, status: "connected", authStatus: "unknown", canLogin: false, tools: [] });

test("servers from every loaded provider form one table, global first, then by provider and name", () => {
  const claude = source("claude", "Claude"), codex = source("codex", "Codex");
  const rows = listMcpServerRows([
    { source: codex, state: { status: "loaded", result: { kind: "servers", servers: [server("repo", "workspace"), server("docs", "global")] } } },
    { source: claude, state: { status: "loaded", result: { kind: "servers", servers: [server("old", "unknown"), server("gmail", "global")], notice: "Sign in" } } },
    { source: codex, state: { status: "loading" } }
  ]);
  assert.deepEqual(rows.map((row) => `${row.source.label}:${row.server.name}`), ["Claude:gmail", "Codex:docs", "Codex:repo", "Claude:old"]);
});
