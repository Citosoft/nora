import assert from "node:assert/strict";
import test from "node:test";
import { registrableDomain, resolveMcpServerLogo } from "@main/providers/mcpLogo";
import { normalizeClaudeMcp } from "@main/providers/claude/mcp";
import { normalizeCodexMcp } from "@main/providers/codex/mcp";

test("advertised MCP icons win and keep their light and dark variants", () => {
  assert.deepEqual(resolveMcpServerLogo({ endpointUrl: "https://mcp.vercel.com/", serverInfo: { name: "Vercel", version: "1", websiteUrl: "https://vercel.com",
    icons: [{ src: "https://mcp.vercel.com/icons/vercel-light.svg", theme: "light" }, { src: "https://mcp.vercel.com/icons/vercel-dark.svg", theme: "dark" }] } }),
  { kind: "icon", lightUrl: "https://mcp.vercel.com/icons/vercel-light.svg", darkUrl: "https://mcp.vercel.com/icons/vercel-dark.svg" });
  assert.deepEqual(resolveMcpServerLogo({ serverInfo: { icons: [{ src: "http://insecure.example/icon.png" }, { src: "https://ok.example/icon.png" }] } }),
    { kind: "icon", lightUrl: "https://ok.example/icon.png", darkUrl: "https://ok.example/icon.png" }, "non-https icons are ignored");
});

test("without icons the website, then the endpoint domain, identifies the server", () => {
  assert.deepEqual(resolveMcpServerLogo({ serverInfo: { websiteUrl: "https://stripe.com/docs" }, endpointUrl: "https://mcp.example.net" }), { kind: "domain", domain: "stripe.com" });
  assert.deepEqual(resolveMcpServerLogo({ serverInfo: { name: "PostHog", version: "1" }, endpointUrl: "https://mcp.posthog.com/mcp" }), { kind: "domain", domain: "posthog.com" });
  assert.equal(resolveMcpServerLogo({ serverInfo: null, endpointUrl: null }), undefined, "local stdio servers have no logo");
  assert.equal(resolveMcpServerLogo({ serverInfo: "garbage", endpointUrl: "https://127.0.0.1:8080" }), undefined);
});

test("registrable domains keep country second-level suffixes", () => {
  assert.equal(registrableDomain("mcp.supabase.com"), "supabase.com");
  assert.equal(registrableDomain("app.example.co.uk"), "example.co.uk");
  assert.equal(registrableDomain("localhost"), null);
});

test("both runtimes attach logos from what they report", () => {
  assert.deepEqual(normalizeClaudeMcp({ name: "claude.ai PostHog", status: "connected", source: "claudeai", serverInfo: { name: "PostHog", version: "1.0.0" },
    config: { type: "claudeai-proxy", url: "https://mcp.posthog.com/mcp", id: "x" } }).logo, { kind: "domain", domain: "posthog.com" });
  assert.deepEqual(normalizeCodexMcp({ name: "expo", authStatus: "oAuth", runtimeStatus: "connected", tools: {}, httpOrigin: "https://mcp.expo.dev",
    serverInfo: { name: "Expo MCP Server", version: "1" } }, null).logo, { kind: "domain", domain: "expo.dev" });
});
