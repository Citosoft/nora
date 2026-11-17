import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { TestContext } from "node:test";
import { ExecutionHost } from "@main/execution/host";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import type { ProviderMcpAppAction, ProviderMcpAppResult } from "@main/types/execution/mcpApp.types";
import type { ToolActivity } from "@shared/types/conversation/contracts.types";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { fixture, workspaceAuthority } from "./fixture";
import { ProviderDouble } from "./providerDouble";

class WidgetProvider extends ProviderDouble {
  readonly actions: ProviderMcpAppAction[] = [];
  override readonly capabilities: ProviderCapabilities;
  constructor(toolCalls: boolean) { super(); this.capabilities = { ...nativeCapabilities, mcpApps: { toolCalls } }; }
  async mcpApp(_conversation: unknown, action: ProviderMcpAppAction): Promise<ProviderMcpAppResult> {
    this.actions.push(action);
    return action.kind === "read-resource"
      ? { kind: "resource", resource: { html: "<p>Chart</p>", permissions: {}, csp: { connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] } } }
      : { kind: "tool-result", result: { content: [{ type: "text", text: "Done" }] } };
  }
}

const tool: ToolActivity = { id: "chart-call", runId: "run", createdAt: "2026-10-21T10:00:00.000Z", kind: "tool", label: "chart", output: "Charted", state: "completed",
  details: { category: "integration", app: { server: "lab", tool: "chart", resourceUri: "ui://lab/chart", displayMode: "inline" } } };

async function withHost(toolCalls: boolean, t: TestContext, run: (host: ExecutionHost, provider: WidgetProvider) => Promise<void>) {
  const f = fixture(t); f.create();
  const provider = new WidgetProvider(toolCalls);
  const providers = new ProviderRegistry(); providers.register(provider);
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority, owner: { id: randomUUID(), processId: process.pid },
    isProcessAlive: () => true, now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, onFailure: () => {} });
  host.start();
  try {
    f.submit();
    const turn = f.snapshot().runs[0];
    f.engine.accept({ conversationId: "conversation", runId: "run", attemptId: turn.attemptId, eventId: "tool", kind: "item", item: tool });
    await run(host, provider);
  } finally { await host.shutdown(); }
}

const request = (itemId: string, action: { kind: "open" } | { kind: "call-tool"; tool: string; arguments: Record<string, string> }) =>
  ({ schemaVersion: 1 as const, environmentId: "local", conversationId: "conversation", itemId, action });

test("widgets open from their stored tool item, never from caller-chosen servers", async (t) => {
  await withHost(true, t, async (host, provider) => {
    const opened = await host.mcpApp(request("chart-call", { kind: "open" }));
    assert.equal(opened.kind, "resource");
    assert.equal(opened.kind === "resource" && opened.toolCalls, true);
    assert.deepEqual(provider.actions[0], { kind: "read-resource", server: "lab", uri: "ui://lab/chart", itemId: "chart-call" });
    const called = await host.mcpApp(request("chart-call", { kind: "call-tool", tool: "refresh", arguments: { range: "week" } }));
    assert.equal(called.kind, "tool-result");
    assert.deepEqual(provider.actions[1], { kind: "call-tool", server: "lab", tool: "refresh", arguments: { range: "week" } });
    await assert.rejects(host.mcpApp(request("unknown-item", { kind: "open" })), /no widget/);
    await assert.rejects(host.mcpApp({ ...request("chart-call", { kind: "open" }), conversationId: "missing" }), /does not exist/);
  });
});

test("runtimes that cannot run widget tool calls refuse them before reaching the provider", async (t) => {
  await withHost(false, t, async (host, provider) => {
    const opened = await host.mcpApp(request("chart-call", { kind: "open" }));
    assert.equal(opened.kind === "resource" && opened.toolCalls, false);
    const called = await host.mcpApp(request("chart-call", { kind: "call-tool", tool: "refresh", arguments: {} }));
    assert.equal(called.kind, "unavailable");
    assert.equal(provider.actions.length, 1);
  });
});
