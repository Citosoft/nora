import assert from "node:assert/strict";
import test from "node:test";
import { appFileName, appFileSchema, canInstallAppConnector, exportAppFile, matchAppFileConnectors, rebindAppFileSpec } from "@shared/apps/portable";
import { appSpecSchema } from "@shared/apps/contracts";
import type { AppDefinition } from "@shared/types/apps/apps.types";
import { CONNECTOR_ID, connector, spec, WORKSPACE_ID } from "../../main/apps/fixture";

const OTHER_ID = "00000000-0000-4000-8000-000000000002";
const app = (): AppDefinition => ({ id: "app-1", name: "CRM: overview", workspaceId: WORKSPACE_ID, threadId: "thread-1", trusted: true, version: 3, suggestions: ["Add a chart"], icon: "users",
  createdAt: "2026-11-19T00:00:00.000Z", updatedAt: "2026-11-19T00:00:00.000Z", spec: appSpecSchema.parse(spec()) });

test("an exported app names its connectors by server, carries no credentials or local state, and reads back through the schema", () => {
  const file = exportAppFile(app(), [connector({ auth: { kind: "header", name: "x-api-key" } })], "2026-11-19T10:00:00.000Z");
  assert.deepEqual(file.connectors, { [CONNECTOR_ID]: { name: "CRM", url: "https://crm.example.com/mcp", auth: { kind: "header", name: "x-api-key" } } });
  assert.equal(file.name, "CRM: overview");
  const text = JSON.stringify(file);
  assert.ok(!text.includes("thread-1") && !text.includes("trusted"), "only the name and spec travel");
  const parsed = appFileSchema.parse(JSON.parse(text)).spec.sources.contacts;
  assert.equal(parsed?.kind === "connector" ? parsed.tool : null, "list_contacts");
  assert.equal(appFileName(file.name), "CRM-overview.nora-app.json");
  assert.equal(file.icon, "users", "the icon travels with the file");
});

test("a connector the app used but that is gone is still listed so the import can ask for a replacement", () => {
  const file = exportAppFile(app(), [], "2026-11-19T10:00:00.000Z");
  assert.equal(file.connectors[CONNECTOR_ID]?.url, "");
  assert.match(file.connectors[CONNECTOR_ID]?.name ?? "", /^Connector 0000/);
});

test("importing matches by server URL (ignoring case and a trailing slash), prefers the same id, and leaves unknown servers unmatched", () => {
  const file = exportAppFile(app(), [connector()], "2026-11-19T10:00:00.000Z");
  const local = connector({ id: OTHER_ID, name: "Their CRM", url: "https://CRM.example.com/mcp/" });
  assert.deepEqual(matchAppFileConnectors(file, [local]), { [CONNECTOR_ID]: OTHER_ID });
  assert.deepEqual(matchAppFileConnectors(file, [local, connector()]), { [CONNECTOR_ID]: CONNECTOR_ID });
  assert.deepEqual(matchAppFileConnectors(file, [connector({ id: OTHER_ID, url: "https://elsewhere.example.com/mcp" })]), { [CONNECTOR_ID]: null });
  const rebound = rebindAppFileSpec(file.spec, { [CONNECTOR_ID]: OTHER_ID });
  const connectorOf = (source: { kind: string; connectorId?: string } | undefined) => source?.kind === "connector" ? source.connectorId : null;
  assert.equal(connectorOf(rebound.sources.contacts), OTHER_ID);
  assert.equal(rebound.actions.ticket?.connectorId, OTHER_ID);
  assert.equal(connectorOf(file.spec.sources.contacts), CONNECTOR_ID, "the file is left as it was");
});


test("only portable OAuth connectors can be installed without recipient configuration", () => {
  const base = { name: "CRM", url: "https://crm.example.com/mcp" };
  assert.equal(canInstallAppConnector(base), false);
  assert.equal(canInstallAppConnector({ ...base, auth: { kind: "oauth", customClient: false } }), true);
  assert.equal(canInstallAppConnector({ ...base, auth: { kind: "oauth", customClient: true } }), false);
  assert.equal(canInstallAppConnector({ ...base, auth: { kind: "header", name: "Authorization" } }), false);
  assert.equal(canInstallAppConnector({ ...base, url: "file:///tmp/server", auth: { kind: "oauth", customClient: false } }), false);
  const file = exportAppFile(app(), [connector({ auth: { kind: "oauth", customClient: false, signedIn: true } })], "2026-11-19T10:00:00.000Z");
  assert.deepEqual(file.connectors[CONNECTOR_ID]?.auth, { kind: "oauth", customClient: false });
  assert.equal(appFileSchema.safeParse({ ...file, connectors: { [CONNECTOR_ID]: { ...base, auth: { kind: "oauth", customClient: false, clientSecret: "secret" } } } }).success, false);
});

test("connector matching preserves case-sensitive server paths and query values", () => {
  const file = exportAppFile(app(), [connector({ url: "https://crm.example.com/MCP?account=Alice" })], "2026-11-19T10:00:00.000Z");
  assert.equal(matchAppFileConnectors(file, [connector({ id: OTHER_ID, url: "https://crm.example.com/mcp?account=alice" })])[CONNECTOR_ID], null);
});

test("an imported id does not match an unrelated server with that local id", () => {
  const file = exportAppFile(app(), [connector()], "2026-11-19T10:00:00.000Z");
  assert.equal(matchAppFileConnectors(file, [connector({ url: "https://different.example.com/mcp" })])[CONNECTOR_ID], null);
});
