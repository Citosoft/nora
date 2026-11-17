import assert from "node:assert/strict";
import test from "node:test";
import { acpMcpServers } from "@main/providers/acp/runMcpServers";
import { codexMcpServersConfig } from "@main/providers/codex/runMcpServers";
import type { RunMcpServer } from "@main/types/nora-tools/noraTools.types";

const servers: RunMcpServer[] = [
  { name: "nora", url: "http://127.0.0.1:1/mcp", token: "n", trustedTools: ["ask_bot"], toolTimeoutSeconds: 960 },
  { name: "linear", url: "http://127.0.0.1:2/connectors/a", token: "g" }
];

test("Codex gets every run server as config overrides, with a timeout only where one is set", () => {
  assert.deepEqual(codexMcpServersConfig(servers), {
    "mcp_servers.nora.enabled": true, "mcp_servers.nora.url": "http://127.0.0.1:1/mcp", "mcp_servers.nora.http_headers": { Authorization: "Bearer n" }, "mcp_servers.nora.tool_timeout_sec": 960,
    "mcp_servers.linear.enabled": true, "mcp_servers.linear.url": "http://127.0.0.1:2/connectors/a", "mcp_servers.linear.http_headers": { Authorization: "Bearer g" }
  });
});

test("ACP agents get run servers only when they support HTTP MCP", () => {
  assert.deepEqual(acpMcpServers(servers, { mcpCapabilities: { http: true } }).map((server) => server.name), ["nora", "linear"]);
  assert.deepEqual(acpMcpServers(servers, { mcpCapabilities: { http: false } }), []);
  assert.deepEqual(acpMcpServers(servers, undefined), []);
});
