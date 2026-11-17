import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTOR_ACCESS_ALL } from "@shared/connectors/access";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { McpServer } from "@shared/types/provider/mcp.types";
import { COMPOSER_CONNECTOR_LOGO_LIMIT, composerConnectorBadge } from "@/components/app/logic/composerConnectors";

const nora = (id: string, status: Connector["status"], enabled = true): Connector => ({ id, name: id, serverName: id, url: "https://x.dev/mcp", enabled,
  auth: { kind: "oauth", customClient: false, signedIn: status !== "needs-auth" }, access: CONNECTOR_ACCESS_ALL, status, tools: [] });
const server = (name: string, status: McpServer["status"]): McpServer => ({ name, status, authStatus: "unknown", scope: "global", canLogin: false, tools: [] });

test("the composer counts Nora's and the provider's connectors together", () => {
  const badge = composerConnectorBadge([nora("a", "connected"), nora("off", "disabled", false)],
    { status: "ready", notice: null, servers: [server("github", "connected"), server("slack", "connected")] });
  assert.deepEqual({ count: badge.count, needsSignIn: badge.needsSignIn }, { count: 3, needsSignIn: false }, "disabled Nora connectors are not counted");
});

test("provider connectors alone still count, and either source can ask for a sign-in", () => {
  assert.equal(composerConnectorBadge([], { status: "ready", notice: null, servers: [server("github", "needs-auth")] }).needsSignIn, true);
  const loading = composerConnectorBadge([nora("a", "needs-auth")], { status: "loading" });
  assert.deepEqual([loading.count, loading.needsSignIn], [1, true]);
  assert.deepEqual(composerConnectorBadge([], null), { count: 0, needsSignIn: false, logos: [] });
});

test("the pill shows a few logos, recognisable ones first, from both sources", () => {
  const github = { kind: "domain" as const, domain: "github.com" };
  const linear = { kind: "domain" as const, domain: "linear.app" };
  const badge = composerConnectorBadge([nora("plain", "connected"), { ...nora("linear", "connected"), logo: linear }],
    { status: "ready", notice: null, servers: [server("custom", "connected"), { ...server("github", "connected"), logo: github }] });
  assert.equal(badge.count, 4);
  assert.equal(badge.logos.length, COMPOSER_CONNECTOR_LOGO_LIMIT);
  assert.deepEqual(badge.logos.map((entry) => entry.key), ["nora:linear", "provider:github", "nora:plain"]);
});
