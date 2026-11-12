import assert from "node:assert/strict";
import test from "node:test";
import { summarizeThreadConnectors, threadMcpSource } from "@/components/app/logic/threadConnectors";
import type { McpServer } from "@shared/types/provider/mcp.types";
import type { ThreadConnectorsInput } from "@/components/app/types/threadConnectors.types";

const server = (name: string, overrides: Partial<McpServer> = {}): McpServer =>
  ({ name, scope: "global", status: "connected", authStatus: "unknown", canLogin: false, tools: [], ...overrides });
const input: ThreadConnectorsInput = { providerLabel: "Claude", conversation: {
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
