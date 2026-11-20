import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openAppStore } from "@main/apps/appStore";
import { appSpecSchema } from "@shared/apps/contracts";
import { moveAppPanel } from "@shared/apps/panelLayout";
import type { AppDefinition } from "@shared/types/apps/apps.types";
import { spec, WORKSPACE_ID } from "./fixture";

const definition = (version: number): AppDefinition => ({ id: "app-1", name: "CRM", workspaceId: WORKSPACE_ID, threadId: "thread-1", trusted: false, version, suggestions: [], icon: "users",
  createdAt: "2026-11-19T00:00:00.000Z", updatedAt: `2026-11-19T00:00:0${version}.000Z`, spec: appSpecSchema.parse(spec()) });

test("apps keep their versions, samples and trust across writes", (t) => {
  const store = openAppStore(":memory:");
  t.after(() => store.close());
  store.put(definition(1), "Created");
  store.put(definition(2), "Moved the table");
  assert.deepEqual(store.list().map((app) => [app.id, app.version]), [["app-1", 2]]);
  assert.deepEqual(store.versions("app-1").map((version) => `${version.version}:${version.summary}`), ["2:Moved the table", "1:Created"]);
  assert.equal(store.versionSpec("app-1", 1)?.ui.root, "main");
  assert.equal(store.versionSpec("app-1", 9), null);
  store.patch({ ...definition(2), trusted: true, name: "Customers" });
  assert.equal(store.get("app-1")?.trusted, true);
  assert.equal(store.get("app-1")?.name, "Customers");
  assert.equal(store.versions("app-1").length, 2, "a patch records no version");
  store.putSample("app-1", { sourceId: "contacts", sampledAt: "2026-11-19T00:00:00.000Z", result: { results: [] } });
  assert.deepEqual(store.sample("app-1", "contacts")?.result, { results: [] });
  store.remove("app-1");
  assert.equal(store.get("app-1"), null);
  assert.equal(store.sample("app-1", "contacts"), null);
  assert.deepEqual(store.versions("app-1"), []);
});

test("a rearranged layout and its original version survive closing and reopening storage", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "nora-panel-layout-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "apps.sqlite");
  const app = definition(1);
  app.spec.ui.elements.main.children = ["card", "other"];
  app.spec.ui.elements.other = { type: "Card", props: { title: "Other" }, children: [] };
  const moved = moveAppPanel(app.spec.ui, { panelId: "other", targetId: "card", placement: "before" });
  const store = openAppStore(path);
  try {
    store.put(app, "Created");
    store.put({ ...app, version: 2, spec: { ...app.spec, ui: moved } }, "Rearranged panels");
  } finally { store.close(); }
  const reopened = openAppStore(path);
  try {
    assert.deepEqual(reopened.get(app.id)?.spec.ui.elements.main.children, ["other", "card"]);
    assert.deepEqual(reopened.versionSpec(app.id, 1)?.ui.elements.main.children, ["card", "other"]);
    assert.equal(reopened.versions(app.id)[0].summary, "Rearranged panels");
  } finally { reopened.close(); }
});

test("listed apps carry the connectors their spec reaches, including apps saved before summaries did", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "nora-app-summary-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "apps.sqlite");
  const app = definition(1);
  const expected = [...new Set([...Object.values(app.spec.sources).flatMap((source) => source.kind === "connector" ? [source.connectorId] : []), ...Object.values(app.spec.actions).map((action) => action.connectorId)])];
  assert.ok(expected.length, "the fixture uses at least one connector");
  const first = openAppStore(path);
  first.put(app, "Created");
  assert.deepEqual(first.list()[0]?.connectorIds, expected);
  first.close();
  const legacy = new DatabaseSync(path);
  const { spec: _spec, ...oldSummary } = app;
  legacy.prepare("UPDATE apps SET summary = ? WHERE id = ?").run(JSON.stringify(oldSummary), app.id);
  legacy.close();
  // Close before the directory is removed: Windows refuses to delete an open SQLite file.
  const reopened = openAppStore(path);
  try { assert.deepEqual(reopened.list()[0]?.connectorIds, expected); } finally { reopened.close(); }
});
