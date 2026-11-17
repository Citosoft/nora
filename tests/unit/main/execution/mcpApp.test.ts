import assert from "node:assert/strict";
import test from "node:test";
import { mcpAppCall, mcpAppMayCallTool, readMcpAppResource, readMcpAppToolResult, readMcpAppToolUi, readMcpAppToolVisibility } from "@main/providers/mcpApp";
import { buildMcpAppCsp } from "@main/helpers/mcpAppCsp";
import { createMcpAppFrames } from "@main/helpers/mcpAppFrames";
import { MCP_APP_PAYLOAD_MAX_BYTES } from "@shared/conversations/mcpApp";
import { timelineItemSchema } from "@shared/conversations/contracts";

const NO_CSP = { connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] };

test("tool descriptors declare widgets only with ui:// addresses, in the current or legacy key", () => {
  assert.deepEqual(readMcpAppToolUi({ ui: { resourceUri: "ui://chart/view", visibility: ["model", "app"] } }),
    { resourceUri: "ui://chart/view", visibility: ["model", "app"] });
  assert.deepEqual(readMcpAppToolUi({ "ui/resourceUri": "ui://legacy" }), { resourceUri: "ui://legacy", visibility: null });
  assert.equal(readMcpAppToolUi({ ui: { resourceUri: "https://example.com/view" } }), null);
  assert.equal(readMcpAppToolUi(undefined), null);
  assert.equal(readMcpAppToolUi({ ui: { resourceUri: "ui://view", visibility: "app" } })?.visibility?.length, 0);
});

test("widgets may call tools unless the server narrowed them to the model, even on tools without a widget", () => {
  assert.equal(mcpAppMayCallTool(null), true);
  assert.equal(mcpAppMayCallTool(["app"]), true);
  assert.equal(mcpAppMayCallTool(["model"]), false);
  assert.equal(mcpAppMayCallTool([]), false);
  assert.deepEqual(readMcpAppToolVisibility({ ui: { visibility: ["model"] } }), ["model"]);
  assert.equal(readMcpAppToolVisibility({ title: "No apps metadata" }), null);
});

test("widget calls keep raw input and results only within the transcript bound, and stay valid timeline items", () => {
  const call = mcpAppCall({ server: "charts", tool: "plot", resourceUri: "ui://charts/plot", input: { series: [1, 2] },
    result: { content: [{ type: "text", text: "Plotted" }], structuredContent: { points: 2 }, isError: null } });
  assert.deepEqual(call, { server: "charts", tool: "plot", resourceUri: "ui://charts/plot", displayMode: "inline", input: { series: [1, 2] },
    result: { content: [{ type: "text", text: "Plotted" }], structuredContent: { points: 2 } } });
  const huge = "x".repeat(MCP_APP_PAYLOAD_MAX_BYTES + 1);
  const bounded = mcpAppCall({ server: "charts", tool: "plot", resourceUri: "ui://charts/plot", input: { huge }, result: { content: [{ type: "text", text: huge }] } });
  assert.deepEqual(bounded, { server: "charts", tool: "plot", resourceUri: "ui://charts/plot", displayMode: "inline" });
  assert.equal(mcpAppCall({ server: "charts", tool: "plot", resourceUri: "https://example.com" }), null);
  assert.ok(timelineItemSchema.safeParse({ id: "tool", runId: "run", createdAt: "2026-11-16T10:00:00.000Z", kind: "tool", label: "plot",
    output: "Plotted", state: "completed", details: { category: "integration", app: call } }).success);
});

test("resource reads pick the MCP Apps document and keep only https origins and known permissions", () => {
  const resource = readMcpAppResource([
    { uri: "ui://view", mimeType: "text/plain", text: "not a widget" },
    { uri: "ui://view", mimeType: "text/html; profile=mcp-app", text: "<p>Widget</p>", _meta: { ui: {
      csp: { connectDomains: ["https://api.example.com/v1", "http://insecure.example.com", "javascript:alert(1)"], resourceDomains: ["https://cdn.example.com"] },
      permissions: { camera: {}, usb: {} }, prefersBorder: false } } }
  ]);
  assert.deepEqual(resource, { html: "<p>Widget</p>", permissions: { camera: {} }, prefersBorder: false,
    csp: { connectDomains: ["https://api.example.com"], resourceDomains: ["https://cdn.example.com"], frameDomains: [], baseUriDomains: [] } });
  const blob = readMcpAppResource([{ uri: "ui://view", mimeType: "text/html;profile=mcp-app", blob: Buffer.from("<b>Hi</b>").toString("base64") }]);
  assert.equal(blob?.html, "<b>Hi</b>");
  assert.equal(readMcpAppResource([{ uri: "ui://view", mimeType: "text/html", text: "<p>Plain HTML</p>" }]), null);
  assert.equal(readMcpAppResource("nope"), null);
});

test("tool results from widgets are validated and drop null members", () => {
  assert.deepEqual(readMcpAppToolResult({ content: [{ type: "text", text: "Done" }], structuredContent: null, isError: false, _meta: {} }),
    { content: [{ type: "text", text: "Done" }], isError: false });
  assert.equal(readMcpAppToolResult({ text: "Done" }), null);
});

test("the widget policy denies network access unless the server declared origins", () => {
  const strict = buildMcpAppCsp(NO_CSP);
  assert.match(strict, /default-src 'none'/);
  assert.match(strict, /connect-src 'none'/);
  assert.match(strict, /frame-src 'none'/);
  assert.match(strict, /form-action 'none'/);
  assert.match(strict, /script-src 'unsafe-inline'(;|$)/);
  const declared = buildMcpAppCsp({ ...NO_CSP, connectDomains: ["https://api.example.com"], resourceDomains: ["https://cdn.example.com"] });
  assert.match(declared, /connect-src https:\/\/api\.example\.com/);
  assert.match(declared, /script-src 'unsafe-inline' https:\/\/cdn\.example\.com/);
});

test("widget frames are served once, on their own host, with their own policy", async () => {
  let now = 1_000;
  const frames = createMcpAppFrames("nora-account", () => now);
  const url = new URL(frames.register({ html: "<p>Widget</p>", csp: NO_CSP, permissions: {} }));
  assert.match(url.host, /^app-[a-f0-9]{32}$/);
  assert.equal(frames.respond(new URL("nora-account://renderer/")), null);
  const response = frames.respond(url);
  assert.equal(response?.status, 200);
  assert.equal(await response?.text(), "<p>Widget</p>");
  assert.match(response?.headers.get("Content-Security-Policy") ?? "", /default-src 'none'/);
  assert.equal(frames.respond(url)?.status, 404);
  const expired = new URL(frames.register({ html: "<p>Late</p>", csp: NO_CSP, permissions: {} }));
  now += 61_000;
  assert.equal(frames.respond(expired)?.status, 404);
  const other = new URL(frames.register({ html: "<p>Path</p>", csp: NO_CSP, permissions: {} }));
  assert.equal(frames.respond(new URL("other.js", other))?.status, 404);
});
