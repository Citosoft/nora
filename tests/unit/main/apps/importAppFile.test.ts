import assert from "node:assert/strict";
import test from "node:test";
import { createAppService } from "@main/apps/appService";
import { openAppStore } from "@main/apps/appStore";
import { importAppFile } from "@main/apps/importAppFile";
import { appSpecSchema } from "@shared/apps/contracts";
import { exportAppFile } from "@shared/apps/portable";
import { connectorAvailableTo } from "@shared/connectors/access";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { AppDefinition } from "@shared/types/apps/apps.types";
import type { AppsIpcDeps } from "@main/types/apps/apps.types";
import { CONNECTOR_ID, WORKSPACE_ID, connector, fakeConnectorTools, fakeFileSources, spec } from "./fixture";

const LOCAL_ID = "00000000-0000-4000-8000-000000000002";
const sourceApp = (): AppDefinition => ({ id: "source-app", name: "CRM", icon: "users", workspaceId: WORKSPACE_ID, threadId: null, trusted: false,
  version: 1, suggestions: [], createdAt: "2026-11-19T00:00:00.000Z", updatedAt: "2026-11-19T00:00:00.000Z", spec: appSpecSchema.parse(spec()) });
const file = () => exportAppFile(sourceApp(), [connector({ auth: { kind: "oauth", customClient: false, signedIn: true } })], "2026-11-19T00:00:00.000Z");

function fixture(t: test.TestContext, initial: Connector[] = []) {
  const entries = [...initial];
  const store = openAppStore(":memory:");
  const tools = fakeConnectorTools(entries);
  tools.available = (subject) => entries.filter((entry) => entry.enabled && connectorAvailableTo(entry.access, subject));
  const apps = createAppService({ store, connectors: tools, files: fakeFileSources(), nextId: () => "imported-app", now: () => "2026-11-20T00:00:00.000Z",
    onChanged: () => undefined, onData: () => undefined, onBuildStep: () => undefined, onAlertsChanged: () => undefined });
  let creations = 0;
  const deps: Pick<AppsIpcDeps, "apps" | "connectors"> = { apps, connectors: {
    list: () => entries,
    async create(input) { creations++; entries.push(connector({ id: LOCAL_ID, name: input.name, url: input.url, auth: { kind: "oauth", customClient: false, signedIn: false },
      access: input.access!, tools: [], status: "needs-auth" })); return entries; },
    async remove(id) { entries.splice(entries.findIndex((entry) => entry.id === id), 1); return entries; }
  } };
  t.after(() => { apps.close(); store.close(); });
  return { deps, entries, creations: () => creations };
}

test("import adds a missing connector scoped to the destination workspace and rebinds sources and actions", async (t) => {
  const { deps, entries, creations } = fixture(t);
  const app = await importAppFile(deps, { kind: "import", workspaceId: WORKSPACE_ID, file: file(), connectorIds: {} });
  assert.equal(creations(), 1);
  assert.equal(app.spec.actions.ticket?.connectorId, LOCAL_ID);
  assert.equal(app.spec.sources.contacts?.kind === "connector" && app.spec.sources.contacts.connectorId, LOCAL_ID);
  assert.deepEqual(entries[0]?.access.workspaces, { kind: "only", ids: [WORKSPACE_ID] });
  assert.equal(app.trusted, false);
});

test("import reuses a recipient's connector without replacing its account or access", async (t) => {
  const existing = connector({ id: LOCAL_ID });
  const { deps, creations, entries } = fixture(t, [existing]);
  const app = await importAppFile(deps, { kind: "import", workspaceId: WORKSPACE_ID, file: file(), connectorIds: {} });
  assert.equal(creations(), 0);
  assert.equal(app.spec.actions.ticket?.connectorId, LOCAL_ID);
  assert.deepEqual(entries, [existing]);
});

test("invalid specs and unavailable explicit bindings fail before installing dependencies", async (t) => {
  const { deps, creations } = fixture(t);
  const broken = file();
  broken.spec.ui = { root: "main", elements: { main: { type: "NotAComponent", props: {}, children: [] } } };
  await assert.rejects(importAppFile(deps, { kind: "import", workspaceId: WORKSPACE_ID, file: broken, connectorIds: {} }), /cannot be imported/);
  await assert.rejects(importAppFile(deps, { kind: "import", workspaceId: WORKSPACE_ID, file: file(), connectorIds: { [CONNECTOR_ID]: LOCAL_ID } }), /not available/);
  assert.equal(creations(), 0);
});

test("header and private-client connectors require recipient setup without silently falling back to OAuth", async (t) => {
  const { deps, creations } = fixture(t);
  const imported = file();
  imported.connectors[CONNECTOR_ID]!.auth = { kind: "header", name: "Authorization" };
  await assert.rejects(importAppFile(deps, { kind: "import", workspaceId: WORKSPACE_ID, file: imported, connectorIds: {} }), /Set up CRM first/);
  assert.equal(creations(), 0);
});

test("a failed app save rolls back connectors created for this installation", async (t) => {
  const { deps, entries } = fixture(t);
  deps.apps.import = async () => { throw new Error("Disk full"); };
  await assert.rejects(importAppFile(deps, { kind: "import", workspaceId: WORKSPACE_ID, file: file(), connectorIds: {} }), /Disk full/);
  assert.equal(entries.length, 0);
});

test("two dependency ids for one server install one connector", async (t) => {
  const { deps, creations } = fixture(t);
  const imported = file();
  imported.connectors[LOCAL_ID] = { ...imported.connectors[CONNECTOR_ID]! };
  imported.spec.actions.ticket!.connectorId = LOCAL_ID;
  const app = await importAppFile(deps, { kind: "import", workspaceId: WORKSPACE_ID, file: imported, connectorIds: {} });
  assert.equal(creations(), 1);
  assert.equal(app.spec.actions.ticket?.connectorId, LOCAL_ID);
});

test("an existing disabled or restricted connector is not silently duplicated or granted broader access", async (t) => {
  const { deps, creations } = fixture(t, [connector({ id: LOCAL_ID, enabled: false })]);
  await assert.rejects(importAppFile(deps, { kind: "import", workspaceId: WORKSPACE_ID, file: file(), connectorIds: {} }), /Enable CRM and allow it/);
  assert.equal(creations(), 0);
});
