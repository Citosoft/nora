import assert from "node:assert/strict";
import test from "node:test";
import { claudeToolAllowed, claudeToolScopeOptions, isClaudeInspectionTool } from "@main/providers/claude/toolScope";
import { inheritsUserMcpConfig, threadToolScope } from "@main/execution/toolScope";
import { snapshotBot } from "@shared/bots/snapshot";
import { bot } from "../../shared/bots/fixtures";

test("Claude read-only threads cannot expose file edits, execution, delegation or external tools", () => {
  assert.deepEqual(claudeToolScopeOptions("inspect"), { tools: ["Read", "Glob", "Grep", "AskUserQuestion"], mcpServers: {}, strictMcpConfig: true });
  for (const name of ["Bash", "PowerShell", "Write", "Edit", "Agent", "mcp__connector__write"]) assert.equal(isClaudeInspectionTool(name), false);
  for (const name of ["Read", "Glob", "Grep", "AskUserQuestion", "mcp__nora__report_workflow_stage"]) assert.equal(isClaudeInspectionTool(name), true);
});

test("read-only workflow reporting exposes only Nora's report tool and no connector servers", async () => {
  const { workflowReviewMcpServers } = await import("@main/nora-tools/endpoint");
  const servers = workflowReviewMcpServers({ tools: { url: "http://127.0.0.1:1/mcp", token: "stage" } });
  const options = claudeToolScopeOptions("inspect", servers);
  assert.deepEqual(options.allowedTools, ["mcp__nora__report_workflow_stage"]);
  assert.deepEqual(Object.keys(options.mcpServers ?? {}), ["nora"]);
  assert.equal(options.strictMcpConfig, true);
});

test("an app's builder thread keeps only the question dialog and the run's own MCP servers; read access still wins over it", async () => {
  const workspace = { environmentId: "local", projectId: "p", checkoutId: "c", path: "/tmp", branch: "main", access: "write" as const };
  assert.equal(threadToolScope({ workspace, source: { kind: "app", appId: null } }), "apps");
  assert.equal(threadToolScope({ workspace: { ...workspace, access: "read" }, source: { kind: "app", appId: null } }), "inspect");
  assert.equal(threadToolScope({ workspace }), "full");
  assert.equal(inheritsUserMcpConfig("full"), true);
  const { runMcpServers } = await import("@main/nora-tools/endpoint");
  const servers = runMcpServers({ tools: { url: "http://127.0.0.1:1/mcp", token: "t" }, connectors: [{ name: "crm", url: "http://127.0.0.1:2/mcp", token: "c" }] });
  const options = claudeToolScopeOptions("apps", servers);
  assert.deepEqual(options.tools, ["AskUserQuestion"]);
  assert.equal(options.strictMcpConfig, true, "the user's global MCP config is left out");
  assert.deepEqual(Object.keys(options.mcpServers ?? {}).sort(), ["crm", "nora"]);
  for (const name of ["Bash", "Read", "Grep", "Edit", "Agent", "WebFetch"]) assert.equal(claudeToolAllowed("apps", name), false, name);
  for (const name of ["AskUserQuestion", "mcp__nora__update_app", "mcp__crm__list_contacts"]) assert.equal(claudeToolAllowed("apps", name), true, name);
  assert.equal(claudeToolAllowed("full", "Bash"), true);
});

test("bots, chats and write workers use agent scope: full built-ins, strict MCP, no user skills", async () => {
  const workspace = { environmentId: "local", projectId: "p", checkoutId: "c", path: "/tmp", branch: "main", access: "write" as const };
  const rex = snapshotBot(bot("rex"));
  assert.equal(threadToolScope({ workspace, bot: rex }), "agent");
  assert.equal(threadToolScope({ workspace, direct: { botId: "rex", name: "Rex", role: "Reviewer", avatar: rex.avatar, scope: { kind: "global" }, workspaceId: "p", retiredAt: null } }), "agent");
  assert.equal(threadToolScope({ workspace, source: { kind: "worker" } }), "agent");
  assert.equal(inheritsUserMcpConfig("agent"), false);
  const { runMcpServers } = await import("@main/nora-tools/endpoint");
  const servers = runMcpServers({ tools: { url: "http://127.0.0.1:1/mcp", token: "t" }, connectors: [{ name: "crm", url: "http://127.0.0.1:2/mcp", token: "c" }] });
  const options = claudeToolScopeOptions("agent", servers);
  assert.equal(options.strictMcpConfig, true);
  assert.deepEqual(options.settingSources, ["project", "local"]);
  assert.deepEqual(options.plugins, []);
  assert.deepEqual(Object.keys(options.mcpServers ?? {}).sort(), ["crm", "nora"]);
  for (const name of ["Bash", "Read", "Edit", "Agent", "mcp__nora__ask_bot", "mcp__crm__list"]) assert.equal(claudeToolAllowed("agent", name), true, name);
});

test("read workers can execute arbitrary commands in a required read-only sandbox without exposing edits or external tools", () => {
  const workspace = { environmentId: "local", projectId: "p", checkoutId: "c", path: "/repo", branch: "main", access: "read" as const };
  assert.equal(threadToolScope({ workspace, source: { kind: "worker" } }), "read-worker");
  assert.equal(threadToolScope({ workspace, source: { kind: "workflow", projectId: "p", runId: "r", stageId: "stage" } }), "inspect");
  const options = claudeToolScopeOptions("read-worker", [], workspace.path);
  assert.ok(Array.isArray(options.tools) && options.tools.includes("Bash"));
  for (const name of ["Read", "Glob", "Grep", "Bash", "AskUserQuestion"]) assert.equal(claudeToolAllowed("read-worker", name), true);
  for (const name of ["Write", "Edit", "Agent", "mcp__connector__write"]) assert.equal(claudeToolAllowed("read-worker", name), false);
  assert.equal(options.sandbox?.enabled, true);
  assert.equal(options.sandbox?.failIfUnavailable, true);
  assert.equal(options.sandbox?.allowUnsandboxedCommands, false);
  assert.deepEqual(options.sandbox?.filesystem?.denyWrite, [workspace.path]);
  assert.deepEqual(options.settingSources, []);
  assert.deepEqual(options.sandbox?.excludedCommands, []);
  assert.deepEqual(options.managedSettings?.sandbox, options.sandbox);
  assert.throws(() => claudeToolScopeOptions("read-worker"), /checkout path/);
});
