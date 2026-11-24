import assert from "node:assert/strict";
import test from "node:test";
import { openAppStore } from "@main/apps/appStore";
import { createAppService } from "@main/apps/appService";
import type { AppRenderData, AppSummary } from "@shared/types/apps/apps.types";
import { until } from "../connectors/fixture";
import { CONNECTOR_ID, connector, fakeConnectorTools, fakeFileSources, SAMPLE, spec, WORKSPACE_ID } from "./fixture";

function serviceFixture(t: test.TestContext) {
  const store = openAppStore(":memory:");
  const connectors = fakeConnectorTools();
  const changes: AppSummary[][] = [];
  const data: AppRenderData[] = [];
  let alertChanges = 0;
  let ids = 0, clock = 0;
  const files = fakeFileSources({ "~/leads.csv": [{ name: "Ada", stage: "lead" }] });
  const service = createAppService({ store, connectors, files, nextId: () => `app-${++ids}`, now: () => new Date(Date.UTC(2026, 10, 19, 0, 0, ++clock)).toISOString(),
    onChanged: (apps) => changes.push(apps), onData: (entry) => data.push(entry), onBuildStep: () => undefined, onAlertsChanged: () => { alertChanges += 1; } });
  t.after(() => { service.close(); store.close(); });
  const subject = { workspaceId: WORKSPACE_ID, botId: null };
  const sampled = async (threadId: string) => { await service.sample({ kind: "connector", appId: null, threadId, sourceId: "contacts", connectorId: CONNECTOR_ID, tool: "list_contacts", args: { limit: 5 }, subject }); };
  const ready = (appId: string) => until(() => service.data(appId).sourceStates.contacts?.status === "ready", "the source to load");
  return { service, connectors, files, changes, data, sampled, ready, alertChanges: () => alertChanges };
}

test("creating an app needs a sample, keeps the sample under the app, loads its sources and records version 1", async (t) => {
  const { service, connectors, changes, sampled, ready } = serviceFixture(t);
  await assert.rejects(service.create({ name: "CRM", workspaceId: WORKSPACE_ID, threadId: "thread-1", spec: spec() }), /No sample exists for source contacts/);
  await sampled("thread-1");
  const app = await service.create({ name: "CRM", workspaceId: WORKSPACE_ID, threadId: "thread-1", spec: spec() });
  assert.equal(app.version, 1);
  assert.equal(changes.at(-1)?.[0]?.id, app.id);
  await ready(app.id);
  const data = service.data(app.id);
  assert.deepEqual(data.sources.contacts, [{ id: "1", name: "Ada" }, { id: "2", name: "Rex" }]);
  assert.equal(connectors.calls.filter((call) => call.tool === "list_contacts").length, 2, "one sample call and one load");
  assert.deepEqual(service.versions(app.id).map((version) => version.summary), ["Created"]);
  // The sample moved with the app, so an update validates against it without sampling again.
  assert.equal(app.icon, "layout-dashboard", "an app created without an icon gets the generic one");
  const updated = await service.update({ id: app.id, spec: spec(), summary: "Same again", suggestions: ["Add a chart of value by stage"], icon: "users" });
  assert.equal(updated.version, 2);
  assert.equal(updated.icon, "users");
  assert.equal(service.list().find((entry) => entry.id === app.id)?.icon, "users", "the icon travels with the summary");
  assert.deepEqual(updated.suggestions, ["Add a chart of value by stage"]);
  assert.deepEqual(service.list().find((entry) => entry.id === app.id)?.suggestions, ["Add a chart of value by stage"], "suggestions travel with the summary");
  const again = await service.update({ id: app.id, spec: spec(), summary: "Again" });
  assert.deepEqual(again.suggestions, [], "a save without suggestions clears the old ones");
  assert.equal(again.icon, "users", "a save without an icon keeps the current one");
  assert.deepEqual(service.versions(app.id).map((version) => version.version), [3, 2, 1]);
});

test("a change made against an older version is refused so it never overwrites the newer one", async (t) => {
  const { service, sampled } = serviceFixture(t);
  await sampled("stale-thread");
  const app = await service.create({ name: "CRM", workspaceId: WORKSPACE_ID, threadId: "stale-thread", spec: spec() });
  const newer = await service.update({ id: app.id, baseVersion: app.version, spec: spec(), summary: "Changed elsewhere" });
  await assert.rejects(service.update({ id: app.id, baseVersion: app.version, spec: spec(), summary: "Stale" }), /now at version 2, not 1.*read_app/);
  assert.equal((await service.update({ id: app.id, baseVersion: newer.version, spec: spec(), summary: "Current" })).version, 3);
  assert.deepEqual(service.versions(app.id).map((version) => version.version), [3, 2, 1]);
});

test("panel moves save restorable versions, broadcast the layout and preserve live data", async (t) => {
  const { service, connectors, changes, sampled, ready } = serviceFixture(t);
  await sampled("layout-thread");
  const input = spec();
  input.ui.elements.main = { type: "Stack", props: {}, children: ["card", "details"] };
  input.ui.elements.details = { type: "Card", props: { title: "Details" }, children: ["form"] };
  const app = await service.create({ name: "CRM", workspaceId: WORKSPACE_ID, threadId: "layout-thread", spec: input });
  await ready(app.id);
  const data = service.data(app.id);
  const calls = connectors.calls.length;
  const notifications = changes.length;
  const move = { panelId: "details", targetId: "card", placement: "before" } as const;
  const moved = service.movePanel(app.id, 1, move);
  assert.equal(moved.version, 2);
  assert.deepEqual(service.get(app.id).spec.ui.elements.main.children, ["details", "card"]);
  assert.deepEqual(moved.spec.sources, app.spec.sources);
  assert.deepEqual(moved.spec.actions, app.spec.actions);
  assert.deepEqual(service.data(app.id), data);
  assert.equal(connectors.calls.length, calls, "layout edits do not fetch sources again");
  assert.equal(changes.length, notifications + 1);
  assert.equal(changes.at(-1)?.[0].version, 2);
  assert.equal(service.versions(app.id)[0].summary, "Rearranged panels");
  assert.throws(() => service.movePanel(app.id, 1, move), /app changed/);
  assert.throws(() => service.movePanel(app.id, 2, { ...move, targetId: "missing" }), /cannot be moved/);
  assert.equal(service.get(app.id).version, 2, "rejected moves do not write versions");
  assert.equal(service.movePanel(app.id, 2, move).version, 2, "unchanged layouts do not write versions");
  const restored = await service.restoreVersion(app.id, 1);
  assert.deepEqual(restored.spec.ui.elements.main.children, ["card", "details"]);
  const rearranged = await service.restoreVersion(app.id, 2);
  assert.deepEqual(rearranged.spec.ui.elements.main.children, ["details", "card"]);
});

test("a failing source reports why, and a restored version becomes a new version", async (t) => {
  const { service, connectors, sampled, ready } = serviceFixture(t);
  await sampled("thread-2");
  const app = await service.create({ name: "CRM", workspaceId: WORKSPACE_ID, threadId: "thread-2", spec: spec() });
  await ready(app.id);
  connectors.reply = () => ({ content: [{ type: "text", text: "rate limited" }], isError: true });
  await service.refresh(app.id);
  const state = service.data(app.id).sourceStates.contacts;
  assert.equal(state?.status, "error");
  assert.equal(state?.status === "error" ? state.kind : null, "tool-failed");
  assert.match(state?.status === "error" ? state.message : "", /rate limited/);
  connectors.reply = () => ({ content: [{ type: "text", text: JSON.stringify(SAMPLE) }] });
  const restored = await service.restoreVersion(app.id, 1);
  assert.equal(restored.version, 2);
  assert.equal(service.versions(app.id)[0]?.summary, "Restored version 1");
});

test("an action calls its tool with the resolved arguments, then refreshes the sources it names", async (t) => {
  const { service, connectors, sampled, ready } = serviceFixture(t);
  await sampled("thread-3");
  const app = await service.create({ name: "CRM", workspaceId: WORKSPACE_ID, threadId: "thread-3", spec: spec() });
  await ready(app.id);
  const before = connectors.calls.length;
  connectors.reply = (tool) => tool === "create_ticket" ? { content: [{ type: "text", text: "Ticket 42 created" }] } : { content: [{ type: "text", text: JSON.stringify(SAMPLE) }] };
  const result = await service.runAction(app.id, "ticket", { subject: "Help", contactId: "1" });
  assert.deepEqual(result, { message: "Ticket 42 created", isError: false });
  assert.deepEqual(connectors.calls[before], { connectorId: CONNECTOR_ID, tool: "create_ticket", args: { subject: "Help", contactId: "1" } });
  await until(() => connectors.calls.length === before + 2, "the refresh after the action");
  assert.equal(connectors.calls.at(-1)?.tool, "list_contacts");
  await assert.rejects(service.runAction(app.id, "nope", {}), /no longer part of the app/);
  // Every run lands in the activity log with what was sent, whether the user confirmed it, and the tool's full reply.
  connectors.reply = () => ({ content: [{ type: "text", text: JSON.stringify({ id: "1", stage: "customer" }) }] });
  assert.equal((await service.runAction(app.id, "ticket", { subject: "Move", contactId: "1" }, false)).message, "Done · id 1 · stage customer");
  const activity = service.activity(app.id);
  assert.deepEqual(activity.map((entry) => [entry.actionId, entry.tool, entry.connectorName, entry.confirmed, entry.ok]), [["ticket", "create_ticket", "CRM", false, true], ["ticket", "create_ticket", "CRM", true, true]]);
  assert.deepEqual(activity[0]?.args, { subject: "Move", contactId: "1" });
  assert.equal(activity[0]?.message, JSON.stringify({ id: "1", stage: "customer" }));
  service.remove(app.id);
  await assert.rejects(async () => service.activity(app.id), /no longer exists/);
});

test("apps only reach connectors their workspace can use", async (t) => {
  const { service } = serviceFixture(t);
  const other = connector({ access: { workspaces: { kind: "only", ids: ["elsewhere"] }, bots: { kind: "all" } } });
  const limited = createAppService({ store: openAppStore(":memory:"), files: fakeFileSources(), connectors: { ...fakeConnectorTools([other]), available: (subject) => subject.workspaceId === "elsewhere" ? [other] : [] },
    nextId: () => "x", now: () => new Date().toISOString(), onChanged: () => undefined, onData: () => undefined, onBuildStep: () => undefined, onAlertsChanged: () => undefined });
  t.after(() => limited.close());
  await limited.sample({ kind: "connector", appId: null, threadId: "t", sourceId: "contacts", connectorId: CONNECTOR_ID, tool: "list_contacts", args: {}, subject: { workspaceId: WORKSPACE_ID, botId: null } });
  await assert.rejects(limited.create({ name: "CRM", workspaceId: WORKSPACE_ID, threadId: "t", spec: spec() }), /No connector with id/);
  assert.equal(service.list().length, 0);
});

test("a source argument bound to app state is called with the window's value, left out when unset, and remembered for later reloads", async (t) => {
  const { service, connectors, sampled, ready } = serviceFixture(t);
  await sampled("thread-5");
  const bound = spec({ sources: { contacts: { kind: "connector", connectorId: CONNECTOR_ID, tool: "list_contacts", args: { stage: { $state: "/filters/stage" }, limit: 5 }, select: "contacts[].{\"id\": id, \"name\": name}", refresh: { kind: "open" } } } });
  const app = await service.create({ name: "CRM", workspaceId: WORKSPACE_ID, threadId: "thread-5", spec: bound });
  assert.equal(service.data(app.id).sourceStates.contacts, undefined, "a bound source waits for the window's inputs");
  await service.refresh(app.id, ["contacts"], { contacts: { stage: "lead" } });
  assert.deepEqual(connectors.calls.at(-1)?.args, { stage: "lead", limit: 5 });
  await service.refresh(app.id, ["contacts"], { contacts: { stage: "" } });
  assert.deepEqual(connectors.calls.at(-1)?.args, { limit: 5 }, "an empty value leaves the argument out");
  await service.refresh(app.id, ["contacts"], { contacts: { stage: "customer" } });
  await service.runAction(app.id, "ticket", { subject: "x", contactId: "1" });
  await until(() => connectors.calls.at(-1)?.tool === "list_contacts" && connectors.calls.at(-1)?.args.stage === "customer", "the action's reload to reuse the last inputs");
  await ready(app.id);
});

test("an alert fires when its condition holds, reports again only when its key changes, clears when it stops, and background sources tick while the app is closed", async (t) => {
  const store = openAppStore(":memory:");
  const connectors = fakeConnectorTools();
  const ticks: (() => void)[] = [];
  let alertChanges = 0, clock = 0;
  const service = createAppService({ store, connectors, files: fakeFileSources(), nextId: () => "app-a", now: () => new Date(Date.UTC(2026, 10, 19, 0, 0, ++clock)).toISOString(),
    onChanged: () => undefined, onData: () => undefined, onBuildStep: () => undefined, onAlertsChanged: () => { alertChanges += 1; },
    timers: { setInterval: (callback) => { ticks.push(callback); return callback; }, clearInterval: (handle) => { const index = ticks.indexOf(handle as () => void); if (index >= 0) ticks.splice(index, 1); } } });
  t.after(() => { service.close(); store.close(); });
  const subject = { workspaceId: WORKSPACE_ID, botId: null };
  await service.sample({ kind: "connector", appId: null, threadId: "t", sourceId: "contacts", connectorId: CONNECTOR_ID, tool: "list_contacts", args: {}, subject });
  const watched = spec({ sources: { contacts: { kind: "connector", connectorId: CONNECTOR_ID, tool: "list_contacts", args: {}, select: "results", refresh: { kind: "interval", seconds: 60, background: true } } },
    alerts: { leads: { source: "contacts", when: "$count($[name='Rex']) > 0", title: "${$count($[name='Rex'])} lead to call", detail: "${$join($[name='Rex'].name, ', ')}", tier: "needs-you" } } });
  const app = await service.create({ name: "CRM", workspaceId: WORKSPACE_ID, threadId: "t", spec: watched });
  assert.equal(ticks.length, 1, "a background source is scheduled from creation");
  await until(() => service.data(app.id).sourceStates.contacts?.status === "ready", "the first load");
  assert.deepEqual(service.activeAlerts(), [{ appId: app.id, appName: "CRM", workspaceId: WORKSPACE_ID, alertId: "leads", title: "1 lead to call", detail: "Rex", tier: "needs-you", firedAt: service.activeAlerts()[0]?.firedAt }]);
  assert.equal(alertChanges, 1);
  await service.refresh(app.id);
  assert.equal(alertChanges, 1, "the same report does not fire again");
  connectors.reply = () => ({ content: [{ type: "text", text: JSON.stringify({ results: [{ id: "1", name: "Ada" }] }) }] });
  ticks[0]?.();
  await until(() => service.activeAlerts().length === 0, "the alert to clear on a background tick");
  assert.equal(alertChanges, 2);
  service.remove(app.id);
  assert.equal(ticks.length, 0, "removing the app stops its background source");
});

test("an imported spec needs no samples, starts at version 1 with no builder thread, and loads its sources", async (t) => {
  const { service, ready } = serviceFixture(t);
  const app = await service.import({ name: "Shared CRM", workspaceId: WORKSPACE_ID, spec: spec() });
  assert.equal(app.version, 1);
  assert.equal(app.threadId, null);
  assert.deepEqual(service.versions(app.id).map((version) => version.summary), ["Imported from a file"]);
  await ready(app.id);
  assert.deepEqual(service.data(app.id).sources.contacts, [{ id: "1", name: "Ada" }, { id: "2", name: "Rex" }]);
  // A connector the file could not be matched to is still reported, since the spec is validated like any other.
  await assert.rejects(service.import({ name: "Broken", workspaceId: WORKSPACE_ID, spec: spec({ sources: { contacts: { kind: "connector", connectorId: "00000000-0000-4000-8000-000000000009", tool: "list_contacts", args: {}, select: "results", refresh: { kind: "open" } } } }) }), /No connector with id/);
});

test("a file source is sampled from disk, loads as rows, and reloads when the file changes while the app is on screen", async (t) => {
  const { service, files } = serviceFixture(t);
  const fileSpec = spec({ sources: { leads: { kind: "file", path: "~/leads.csv", select: "$", refresh: { kind: "open" } } }, actions: {},
    ui: { root: "main", elements: { main: { type: "Stack", props: {}, children: ["table"] }, table: { type: "Table", props: { rows: { $state: "/sources/leads" }, columns: [{ key: "name", label: "Name" }] }, children: [] } } } });
  await assert.rejects(service.create({ name: "Leads", workspaceId: WORKSPACE_ID, threadId: "thread-9", spec: fileSpec }), /sample_file with source_id "leads"/);
  await service.sample({ kind: "file", appId: null, threadId: "thread-9", sourceId: "leads", path: "~/leads.csv" });
  const app = await service.create({ name: "Leads", workspaceId: WORKSPACE_ID, threadId: "thread-9", spec: fileSpec });
  await until(() => service.data(app.id).sourceStates.leads?.status === "ready", "the file to load");
  assert.deepEqual(service.data(app.id).sources.leads, [{ name: "Ada", stage: "lead" }]);
  service.watch(app.id);
  files.files.set("~/leads.csv", [{ name: "Ada", stage: "lead" }, { name: "Rex", stage: "customer" }]);
  files.change("~/leads.csv");
  await until(() => (service.data(app.id).sources.leads as unknown[]).length === 2, "the file change to show");
  service.unwatch(app.id);
  files.files.set("~/leads.csv", []);
  files.change("~/leads.csv");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal((service.data(app.id).sources.leads as unknown[]).length, 2, "an app off screen does not follow the file");
  files.files.delete("~/leads.csv");
  await service.refresh(app.id);
  assert.equal(service.data(app.id).sourceStates.leads?.status, "error");
});

test("a paged source loads one page, offers more, appends the next page with the offset or cursor, and stops at the end", async (t) => {
  const { service, connectors, sampled, ready } = serviceFixture(t);
  await sampled("thread-p");
  const all = [{ id: "1", name: "Ada" }, { id: "2", name: "Rex" }, { id: "3", name: "Moss" }];
  connectors.reply = (_tool, args) => {
    const offset = typeof args.offset === "number" ? args.offset : 0;
    const page = all.slice(offset, offset + 2);
    return { content: [{ type: "text", text: JSON.stringify({ results: page, next: offset + 2 < all.length ? `c${offset + 2}` : null }) }] };
  };
  const paged = spec({ sources: { contacts: { kind: "connector", connectorId: CONNECTOR_ID, tool: "list_contacts", args: { limit: 2 }, select: "results[].{\"id\": id, \"name\": name}", page: { kind: "offset", arg: "offset", size: 2 }, refresh: { kind: "open" } } } });
  const app = await service.create({ name: "Paged", workspaceId: WORKSPACE_ID, threadId: "thread-p", spec: paged });
  await ready(app.id);
  const hasMore = () => { const state = service.data(app.id).sourceStates.contacts; return state?.status === "ready" ? state.hasMore : null; };
  assert.equal(hasMore(), true);
  assert.deepEqual(service.data(app.id).sources.contacts, [{ id: "1", name: "Ada" }, { id: "2", name: "Rex" }]);
  const more = await service.loadMore(app.id, "contacts");
  assert.deepEqual(connectors.calls.at(-1)?.args, { limit: 2, offset: 2 });
  assert.deepEqual(more.sources.contacts, all);
  assert.equal(hasMore(), false, "a short page is the end");
  assert.deepEqual((await service.loadMore(app.id, "contacts")).sources.contacts, all, "nothing more to load");
  // A cursor source hands the tool whatever `next` picked out of the last result.
  connectors.reply = (_tool, args) => {
    const offset = args.cursor === "c2" ? 2 : 0;
    return { content: [{ type: "text", text: JSON.stringify({ results: all.slice(offset, offset + 2), next: offset + 2 < all.length ? `c${offset + 2}` : null }) }] };
  };
  const byCursor = await service.update({ id: app.id, spec: spec({ sources: { contacts: { kind: "connector", connectorId: CONNECTOR_ID, tool: "list_contacts", args: { limit: 2 }, select: "results[].{\"id\": id, \"name\": name}", page: { kind: "cursor", arg: "cursor", next: "next" }, refresh: { kind: "open" } } } }), summary: "cursor" });
  await ready(byCursor.id);
  await service.loadMore(app.id, "contacts");
  assert.deepEqual(connectors.calls.at(-1)?.args, { limit: 2, cursor: "c2" });
  assert.deepEqual(service.data(app.id).sources.contacts, all);
  assert.equal(hasMore(), false);
});
