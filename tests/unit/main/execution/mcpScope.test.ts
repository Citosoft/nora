import assert from "node:assert/strict";
import test from "node:test";
import { claudeAccountConnectorNotice, claudeMcpScope } from "@main/providers/claude/mcp";
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
  assert.match(claudeAccountConnectorNotice({ tokenSource: "none", apiKeySource: "none", apiProvider: "firstParty" }) ?? "", /not signed in.*claude auth login/);
  assert.match(claudeAccountConnectorNotice({ tokenSource: "none", apiKeySource: "ANTHROPIC_API_KEY" }) ?? "", /API key takes precedence/);
  assert.match(claudeAccountConnectorNotice({ tokenSource: "CLAUDE_CODE_OAUTH_TOKEN", apiKeySource: "none" }) ?? "", /long-lived token/);
  assert.match(claudeAccountConnectorNotice({ apiProvider: "bedrock" }) ?? "", /third-party API provider/);
});
