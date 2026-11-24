import assert from "node:assert/strict";
import test from "node:test";
import { summarizeThreadConnectors, threadAccountConnectorAccess, threadConnectorsTarget, threadMcpSource } from "@/components/app/logic/threadConnectors";
import type { McpServer } from "@shared/types/provider/mcp.types";
import type { ThreadConnectorsInput } from "@/components/app/types/threadConnectors.types";

const server = (name: string, overrides: Partial<McpServer> = {}): McpServer =>
  ({ name, scope: "global", status: "connected", authStatus: "unknown", canLogin: false, tools: [], ...overrides });
const input: ThreadConnectorsInput = { providerLabel: "Claude", accountConnectors: { kind: "all" }, conversation: {
  provider: { kind: "claude", instanceId: "claude-1", model: "opus", reasoning: null, permissionPolicy: "default" },
  workspace: { projectId: "p", environmentId: "local", checkoutId: "c", path: "/repo", branch: "main", access: "write" } } };

test("thread connectors query only the thread's provider instance, scoped to its checkout", () => {
  const source = threadMcpSource(input);
  assert.deepEqual(source.selection, { environmentId: "local", providerKind: "claude", instanceId: "claude-1", workspace: input.conversation.workspace });
  assert.equal(source.label, "Claude");
});

test("thread connectors list set-up, enabled servers by name and keep the runtime notice", () => {
  const summary = summarizeThreadConnectors({ status: "loaded", result: { kind: "servers", notice: "Sign in to load account connectors", servers: [
    server("slack", { accountConnector: "available" }), server("linear", { status: "needs-auth" }), server("off", { status: "disabled" }),
    server("github", { scope: "workspace" }), server("gmail", { accountConnector: "connected" })] } });
  assert.equal(summary.status, "ready");
  if (summary.status !== "ready") return;
  assert.deepEqual(summary.servers.map((entry) => entry.name), ["github", "gmail", "linear"]);
  assert.equal(summary.notice, "Sign in to load account connectors");
});

test("thread connectors surface runtime and transport failures as unavailable", () => {
  assert.deepEqual(summarizeThreadConnectors({ status: "loaded", result: { kind: "unavailable", message: "Not supported" } }), { status: "unavailable", message: "Not supported" });
  assert.deepEqual(summarizeThreadConnectors({ status: "error", message: "Failed" }), { status: "unavailable", message: "Failed" });
  assert.deepEqual(summarizeThreadConnectors({ status: "loading" }), { status: "loading" });
});

test("a draft discovers with the provider it will send with, even before the user picks one", () => {
  const { provider, workspace } = input.conversation;
  const picked = { ...provider, instanceId: "claude-2" };
  assert.deepEqual(threadConnectorsTarget(null, { provider: null, readyBinding: provider, workspace }), { provider, workspace },
    "the model picker's default is used until the user picks");
  assert.deepEqual(threadConnectorsTarget(null, { provider: picked, readyBinding: provider, workspace })?.provider, picked);
  assert.equal(threadConnectorsTarget(null, { provider: null, readyBinding: null, workspace }), null, "nothing to discover until a binding resolves");
  assert.equal(threadConnectorsTarget(input.conversation, { provider: picked, readyBinding: null, workspace }), input.conversation, "a stored thread uses its own");
});

test("bot and chat threads list only the account connectors their runs get", () => {
  const state = { status: "loaded" as const, result: { kind: "servers" as const, servers: [
    server("claude.ai Gmail", { accountConnector: "connected" }), server("claude.ai Vercel", { accountConnector: "connected" }), server("notion") ] } };
  const names = (access: ReturnType<typeof threadAccountConnectorAccess>) => {
    const summary = summarizeThreadConnectors(state, access);
    return summary.status === "ready" ? summary.servers.map((entry) => entry.name) : [];
  };
  assert.deepEqual(names(threadAccountConnectorAccess(null, [])), ["claude.ai Gmail", "claude.ai Vercel", "notion"], "a draft or own thread gets them all");
  assert.deepEqual(names(threadAccountConnectorAccess({ chatBranch: { from: null } }, ["claude.ai Gmail"])), ["notion"], "a chat gets none");
  assert.deepEqual(names({ kind: "only", names: ["claude.ai Gmail"] }), ["claude.ai Gmail", "notion"], "a bot gets its choice");
});
