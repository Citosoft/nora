import assert from "node:assert/strict";
import test from "node:test";
import { threadLoadsAccountExtras } from "@main/execution/toolScope";
import { claudeSessionSettings } from "@main/providers/claude/sessionSettings";
import { claudeAccountConnectorOptions, createClaudeAccountConnectorDirectory } from "@main/providers/claude/accountConnectors";
import { accountConnectorsForBot } from "@shared/bots/connectorSelection";
import { parseSharedBotFile, serializeSharedBotFile } from "@shared/bots/botFile";
import { snapshotBot } from "@shared/bots/snapshot";
import type { McpServerStatus } from "@anthropic-ai/claude-agent-sdk";
import { bot as botFixture } from "../../shared/bots/fixtures";

const workspace = { environmentId: "local", projectId: "p", checkoutId: "c", path: "/repo", branch: "main", access: "write" as const };

test("only the user's own working thread loads the signed-in account's extras", () => {
  assert.equal(threadLoadsAccountExtras({ workspace }), true);
  assert.equal(threadLoadsAccountExtras({ workspace, chatBranch: { from: null } }), false, "a chat branch skips them");
  assert.equal(threadLoadsAccountExtras({ workspace, bot: snapshotBot(botFixture("rex")) }), false, "a bot skips them");
  assert.equal(threadLoadsAccountExtras({ workspace, source: { kind: "worker" } }), false, "a write worker skips them");
  assert.equal(threadLoadsAccountExtras({ workspace, source: { kind: "app", appId: null } }), false, "an app's builder skips them");
  assert.equal(threadLoadsAccountExtras({ workspace: { ...workspace, access: "read" } }), false, "a review skips them");
  assert.equal(threadLoadsAccountExtras({ workspace: { ...workspace, access: "read" }, source: { kind: "worker" } }), false);
});

test("Claude sessions without account extras turn off synced plugins and skills for that session only", () => {
  assert.equal(claudeSessionSettings({ model: "m", accountExtras: true }, undefined), undefined);
  assert.deepEqual(claudeSessionSettings({ model: "m", accountExtras: false }, undefined), { syncClaudeAiPlugins: false, syncClaudeAiSkills: false });
});

test("Claude session settings keep the output budget and auto-compaction alongside the account opt-out", () => {
  assert.deepEqual(claudeSessionSettings({ model: "m", autoCompactTokens: 150_000, accountExtras: false }, { bashOutputMaxChars: 10 }), {
    bashOutputMaxChars: 10, autoCompactEnabled: true, autoCompactWindow: 150_000, modelSettings: { m: { autoCompactWindow: 150_000 } },
    syncClaudeAiPlugins: false, syncClaudeAiSkills: false });
  assert.deepEqual(claudeSessionSettings({ model: "m", accountExtras: true }, { bashOutputMaxChars: 10 }), { bashOutputMaxChars: 10 });
});

const gmail = { type: "claudeai-proxy" as const, url: "https://gmail.example/mcp", id: "mcpsrv_gmail" };
const vercel = { type: "claudeai-proxy" as const, url: "https://vercel.example/mcp", id: "mcpsrv_vercel" };
const listing: McpServerStatus[] = [
  { name: "claude.ai Gmail", status: "connected", scope: "claudeai", config: gmail },
  { name: "claude.ai Vercel", status: "connected", scope: "claudeai", config: vercel },
  { name: "notion", status: "connected", scope: "user", config: { type: "http", url: "https://notion.example/mcp" } }
];

test("without account extras a session turns off claude.ai connectors but connects the ones it was given", () => {
  assert.deepEqual(claudeAccountConnectorOptions({ accountExtras: true, accountConnectors: {} }), { env: {}, mcpServers: {} });
  assert.deepEqual(claudeAccountConnectorOptions({ accountExtras: false, accountConnectors: { "claude.ai Gmail": gmail } }),
    { env: { ENABLE_CLAUDEAI_MCP_SERVERS: "false" }, mcpServers: { "claude.ai Gmail": gmail } });
});

test("the account connector directory resolves names from discovery and lists again only for names it does not know", async () => {
  let lists = 0;
  const directory = createClaudeAccountConnectorDirectory(async () => { lists++; return listing; });
  directory.remember(listing);
  assert.deepEqual(await directory.resolve("/repo", ["claude.ai Gmail"]), { "claude.ai Gmail": gmail });
  assert.equal(lists, 0, "known names need no listing");
  assert.deepEqual(await directory.resolve("/repo", ["claude.ai Gmail", "claude.ai Gone", "notion"]), { "claude.ai Gmail": gmail }, "unknown names and non-account servers are left out");
  assert.equal(lists, 1);
  const failing = createClaudeAccountConnectorDirectory(async () => { throw new Error("offline"); });
  assert.deepEqual(await failing.resolve("/repo", ["claude.ai Gmail"]), {}, "a failed listing gives no connectors rather than failing the run");
});

const bot = { id: "care", name: "Care", role: "Support", instructions: "Help.", accountConnectors: ["claude.ai Gmail"],
  binding: { kind: "claude" as const, instanceId: "claude", model: "opus", reasoning: null, permissionPolicy: null },
  avatar: { seed: 1 }, scope: { kind: "global" as const }, revision: 1 };

test("a bot's account connectors are read live and default to none", () => {
  const settings = { global: [bot], workspaces: {} };
  assert.deepEqual(accountConnectorsForBot(settings, [], { workspaceId: "p", botId: "care" }), ["claude.ai Gmail"]);
  assert.deepEqual(accountConnectorsForBot({ global: [{ ...bot, accountConnectors: undefined }], workspaces: {} }, [], { workspaceId: "p", botId: "care" }), []);
  assert.deepEqual(accountConnectorsForBot(settings, [], { workspaceId: "p", botId: "gone" }), []);
  assert.deepEqual(accountConnectorsForBot(settings, [], { workspaceId: "p", botId: null }), []);
});

test("shared bot files keep a bot's account connectors", () => {
  const shared = { ...bot, scope: { kind: "workspace" as const, workspaceId: "w", storage: "shared" as const } };
  const text = serializeSharedBotFile(shared);
  assert.match(text, /^account-connectors: \["claude\.ai Gmail"\]$/m);
  const parsed = parseSharedBotFile("care.md", text, "w");
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.bot.accountConnectors, ["claude.ai Gmail"]);
  const invalid = parseSharedBotFile("care.md", text.replace('["claude.ai Gmail"]', '["a","a"]'), "w");
  assert.deepEqual(invalid, { ok: false, message: "account-connectors: Enter a JSON array of unique account connector names" });
});
