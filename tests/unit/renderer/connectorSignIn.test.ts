import assert from "node:assert/strict";
import test from "node:test";
import { connectorSignInDetail, connectorSignInStatus } from "@/components/app/logic/connectorSignIn";
import { timelineItemSchema } from "@shared/conversations/contracts";
import type { McpServer } from "@shared/types/provider/mcp.types";
import type { ThreadConnectorsSummary } from "@/components/app/types/threadConnectors.types";

const server = (name: string, overrides: Partial<McpServer> = {}): McpServer =>
  ({ name, scope: "global", status: "connected", authStatus: "authenticated", canLogin: false, tools: [], ...overrides });
const ready = (...servers: McpServer[]): ThreadConnectorsSummary => ({ status: "ready", servers, notice: null });
const status = (summary: ThreadConnectorsSummary | undefined, login?: Parameters<typeof connectorSignInStatus>[0]["login"]) =>
  connectorSignInStatus({ serverName: "Linear", summary, login });

test("connector sign-in requests are timeline items naming the server", () => {
  const item = { id: "i", runId: "r", createdAt: "2026-11-11T00:00:00.000Z", kind: "connector-sign-in", server: "Linear", reason: "Read issues" };
  assert.deepEqual(timelineItemSchema.parse(item), item);
  assert.throws(() => timelineItemSchema.parse({ ...item, server: "" }));
});

test("connector sign-in waits for discovery and surfaces runtime unavailability", () => {
  assert.deepEqual(status(undefined), { kind: "checking" });
  assert.deepEqual(status({ status: "loading" }), { kind: "checking" });
  assert.deepEqual(status({ status: "unavailable", message: "No MCP" }), { kind: "unavailable", message: "No MCP" });
});

test("connector sign-in matches the requested server regardless of casing", () => {
  const linear = server("linear", { status: "needs-auth", authStatus: "needs-auth", canLogin: true });
  assert.deepEqual(status(ready(server("GitHub"), linear)), { kind: "sign-in", server: linear, failure: null });
  assert.deepEqual(status(ready(server("GitHub"))), { kind: "missing" });
});

test("connector sign-in reports connected only once the runtime is authenticated", () => {
  const connected = server("Linear", { tools: [{ name: "List issues" }] });
  assert.deepEqual(status(ready(connected)), { kind: "connected", server: connected });
  const stale = server("Linear", { authStatus: "needs-auth" });
  assert.deepEqual(status(ready(stale)), { kind: "blocked", server: stale });
  assert.equal(connectorSignInDetail(status(ready(connected)), "Linear", "Claude"), "1 tool available. Send a message to continue.");
});

test("connector sign-in keeps offering a retry after a failed browser sign-in", () => {
  const linear = server("Linear", { status: "needs-auth", authStatus: "needs-auth", canLogin: false });
  const failed = status(ready(linear), { status: "failed", message: "Browser closed" });
  assert.deepEqual(failed, { kind: "sign-in", server: linear, failure: "Browser closed" });
  assert.equal(connectorSignInDetail(failed, "Linear", "Claude"), "Browser closed");
  assert.deepEqual(status(ready(linear)), { kind: "blocked", server: linear });
});
