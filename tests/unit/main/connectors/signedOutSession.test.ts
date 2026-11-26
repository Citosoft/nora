import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTOR_ACCESS_ALL } from "@shared/connectors/access";
import { isSignInToolCall, parseRpcRequest, signedOutReply, usesConnector } from "@main/connectors/signedOutSession";
import type { StoredConnector } from "@main/types/connectors/connectors.types";

const connector: StoredConnector = { id: "c1", name: "Linear", serverName: "linear", url: "https://example.com/mcp", enabled: true,
  auth: { kind: "oauth" }, access: CONNECTOR_ACCESS_ALL };
const request = (body: unknown) => parseRpcRequest(Buffer.from(JSON.stringify(body)));

test("only tool calls, resource reads and prompt fetches count as using the connector", () => {
  assert.equal(usesConnector(request({ jsonrpc: "2.0", id: 1, method: "initialize" })), false);
  assert.equal(usesConnector(request({ jsonrpc: "2.0", id: 1, method: "tools/list" })), false);
  assert.equal(usesConnector(request({ jsonrpc: "2.0", method: "notifications/initialized" })), false);
  assert.equal(usesConnector(parseRpcRequest(undefined)), false);
  assert.equal(usesConnector(request({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "x" } })), true);
  assert.equal(usesConnector(request([{ jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: 2, method: "resources/read" }])), true);
});

test("the signed-out stand-in answers notifications with 202, keeps batch shape and rejects unknown methods", () => {
  assert.deepEqual(signedOutReply("POST", request({ jsonrpc: "2.0", method: "notifications/initialized" }), connector, []), { status: 202 });
  assert.deepEqual(signedOutReply("GET", parseRpcRequest(undefined), connector, []), { status: 405 });
  const batch = signedOutReply("POST", request([{ jsonrpc: "2.0", id: 1, method: "ping" }]), connector, []);
  assert.deepEqual(batch, { status: 200, body: [{ jsonrpc: "2.0", id: 1, result: {} }] });
  const unknown = signedOutReply("POST", request({ jsonrpc: "2.0", id: "a", method: "resources/list" }), connector, []);
  assert.equal(unknown.status, 200);
  assert.ok(unknown.body && !Array.isArray(unknown.body) && "error" in unknown.body);
});

test("the sign-in tool is only intercepted while the connector's real tools do not include one by that name", () => {
  const call = request({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "sign_in" } });
  assert.equal(isSignInToolCall(call, []), true);
  assert.equal(isSignInToolCall(call, [{ name: "sign_in" }]), false);
});
