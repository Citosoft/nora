import assert from "node:assert/strict";
import test from "node:test";
import { claudeAccountConnectorNotice, claudeMcpScope, settleClaudeMcp } from "@main/providers/claude/mcp";
import type { McpServerStatus } from "@anthropic-ai/claude-agent-sdk";
import { codexMcpScope, normalizeCodexMcp } from "@main/providers/codex/mcp";

test("Claude project and local servers belong to the workspace; user, plugin and managed servers are global", () => {
  assert.equal(claudeMcpScope({ source: "project" }), "workspace");
  assert.equal(claudeMcpScope({ scope: "local" }), "workspace");
  assert.equal(claudeMcpScope({ source: "user" }), "global");
  assert.equal(claudeMcpScope({ source: "plugin", scope: "project" }), "global");
  assert.equal(claudeMcpScope({ scope: "claudeai" }), "global");
  assert.equal(claudeMcpScope({}), "unknown");
});

test("Codex scope follows the config layer of each server's keys", () => {
  const origins = { "mcp_servers.docs.command": "user", "mcp_servers.repo.command": "project", "mcp_servers.repo.env.TOKEN": "user" };
  assert.equal(codexMcpScope("docs", null, origins), "global");
  assert.equal(codexMcpScope("repo", null, origins), "workspace");
  assert.equal(codexMcpScope("codex_apps", null, origins), "global", "built-in servers have no config keys");
  assert.equal(codexMcpScope("expo", "expo@plugins", origins), "global");
  assert.equal(codexMcpScope("docs", null, null), "unknown");
});

test("normalized Codex servers carry their scope", () => {
  const server = normalizeCodexMcp({ name: "repo", authStatus: "unsupported", runtimeStatus: "connected", tools: {} }, { "mcp_servers.repo.url": "project" });
  assert.equal(server.scope, "workspace");
});

test("Claude account connectors are explained unless Claude Code uses a claude.ai login", () => {
  assert.equal(claudeAccountConnectorNotice({ tokenSource: "claude.ai", apiKeySource: "none", apiProvider: "firstParty" }), undefined);
  assert.equal(claudeAccountConnectorNotice({ apiProvider: "firstParty", subscriptionType: "Claude Team", email: "me@example.test" }), undefined,
    "current runtimes report a claude.ai login only through its profile");
  assert.match(claudeAccountConnectorNotice({ apiProvider: "firstParty" }) ?? "", /not signed in/);
  assert.match(claudeAccountConnectorNotice({ tokenSource: "claude.ai", apiKeySource: "ANTHROPIC_API_KEY", apiProvider: "firstParty" }) ?? "", /API key takes precedence/);
  assert.match(claudeAccountConnectorNotice({ tokenSource: "CLAUDE_CODE_OAUTH_TOKEN", apiKeySource: "none" }) ?? "", /long-lived token/);
  assert.match(claudeAccountConnectorNotice({ apiProvider: "bedrock" }) ?? "", /third-party API provider/);
});

function fakeClock() {
  let time = 0;
  return { now: () => time, sleep: async (ms: number) => { time += ms; } };
}

test("Claude MCP discovery re-reads until background connections settle", async () => {
  const reads: McpServerStatus["status"][][] = [["pending", "pending"], ["connected", "pending"], ["connected", "failed"]];
  let call = 0;
  const servers = await settleClaudeMcp(async () => reads[Math.min(call++, reads.length - 1)].map((status, index) => ({ name: `s${index}`, status })),
    { ...fakeClock(), budgetMs: 7_000, intervalMs: 500 });
  assert.equal(call, 3);
  assert.deepEqual(servers.map((server) => server.status), ["connected", "failed"]);
});

test("Claude MCP servers still pending after the budget are not reported as connecting", async () => {
  let call = 0;
  const servers = await settleClaudeMcp(async () => { call++; return [{ name: "slow", status: "pending" }, { name: "ok", status: "connected" }]; },
    { ...fakeClock(), budgetMs: 2_000, intervalMs: 500 });
  assert.equal(call, 5, "initial read plus one per interval within the budget");
  assert.equal(servers[0].status, "unknown");
  assert.match(servers[0].message ?? "", /had not finished connecting.*Refresh/);
  assert.equal(servers[1].status, "connected");
});

test("Claude account connectors the user never connected are marked available, not configured", async () => {
  const servers = await settleClaudeMcp(async () => [
    { name: "claude.ai Slack", status: "needs-auth", source: "claudeai" },
    { name: "claude.ai Gmail", status: "connected", source: "claudeai" },
    { name: "local", status: "needs-auth", source: "user" }
  ]);
  assert.deepEqual(servers.map((server) => server.accountConnector), ["available", "connected", undefined]);
});
