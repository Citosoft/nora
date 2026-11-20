import assert from "node:assert/strict";
import test from "node:test";
import { validateAppSpec } from "@main/apps/validateAppSpec";
import { connector, SAMPLE, spec } from "./fixture";

const context = (sample = true) => ({ connectors: [connector()], sample: () => sample ? SAMPLE : undefined });

test("a complete spec whose sources were sampled validates and keeps its UI", async () => {
  const result = await validateAppSpec(spec(), context());
  assert.deepEqual(result.issues, []);
  assert.equal(result.spec?.ui.root, "main");
  assert.equal(result.spec?.sources.contacts?.refresh.kind, "open");
});

test("every problem is reported together: unknown connector, unknown tool, missing sample, bad expression, undeclared references", async () => {
  const input = spec({
    sources: { contacts: { kind: "connector", connectorId: connector().id, tool: "nope", args: {}, select: "results[", refresh: { kind: "open" } },
      other: { kind: "connector", connectorId: "00000000-0000-4000-8000-000000000009", tool: "x", args: {}, select: "$", refresh: { kind: "open" } } },
    actions: { ticket: { connectorId: connector().id, tool: "create_ticket", args: {}, refreshSources: ["gone"] } }
  });
  input.ui.elements.table = { type: "Table", props: { rows: { $state: "/sources/missing" }, columns: [{ key: "name", label: "Name" }], rowAction: "absent" }, children: [] };
  const result = await validateAppSpec(input, context(false));
  assert.equal(result.spec, null);
  const paths = result.issues.map((issue) => issue.path);
  assert.ok(paths.includes("sources.contacts"), "unknown tool");
  assert.ok(paths.includes("sources.contacts.select"), "bad expression");
  assert.ok(paths.includes("sources.other"), "unknown connector");
  assert.ok(paths.includes("sources.other.select"), "missing sample");
  assert.ok(paths.includes("actions.ticket.refreshSources"));
  assert.ok(paths.includes("ui"), "undeclared source reference");
  assert.ok(paths.includes("ui.elements.table.props.rowAction"), "undeclared action");
});

test("the UI is checked against the catalog and json-render's structure", async () => {
  const unknown = spec();
  unknown.ui.elements.card = { type: "Widget", props: {}, children: [] };
  assert.match((await validateAppSpec(unknown, context())).issues.map((issue) => issue.message).join("\n"), /Widget|Invalid/);
  const dangling = spec();
  dangling.ui.elements.main = { type: "Stack", props: {}, children: ["card", "ghost"] };
  const issues = (await validateAppSpec(dangling, context())).issues;
  assert.ok(issues.some((issue) => issue.path === "ui.elements.main" && /ghost/.test(issue.message)), JSON.stringify(issues));
  const badProp = spec();
  badProp.ui.elements.table = { type: "Table", props: { rows: { $state: "/sources/contacts" }, columns: "name" }, children: [] };
  assert.ok((await validateAppSpec(badProp, context())).issues.some((issue) => issue.path.startsWith("ui.elements.table.props.columns")));
});

test("a record view validates: a selectable table, a Record over the selection and a detail source bound to it", async () => {
  const input = spec({ sources: {
    contacts: { kind: "connector", connectorId: connector().id, tool: "list_contacts", args: {}, select: "results[].{\"id\": id, \"name\": name}", refresh: { kind: "open" } },
    contact: { kind: "connector", connectorId: connector().id, tool: "list_contacts", args: { id: { $state: "/selected/contact/id" } }, select: "results[0]", refresh: { kind: "open" } }
  }, actions: {} });
  input.ui = { root: "main", elements: {
    main: { type: "Stack", props: {}, children: ["list", "detail"] },
    list: { type: "Table", props: { rows: { $state: "/sources/contacts" }, columns: [{ key: "name", label: "Name" }], selectPath: "/selected/contact" }, children: [], visible: { $state: "/selected/contact", not: true } },
    detail: { type: "Card", props: { title: "Contact", source: "contact" }, children: ["record", "back"], visible: { $state: "/selected/contact" } },
    record: { type: "Record", props: { item: { $state: "/sources/contact" }, fields: [{ key: "name", label: "Name" }, { key: "id", label: "Id" }] }, children: [] },
    back: { type: "Button", props: { label: "Back" }, children: [], on: { press: { action: "setState", params: { statePath: "/selected/contact", value: null } } } }
  } };
  const result = await validateAppSpec(input, context());
  assert.deepEqual(result.issues, []);
  assert.ok(result.spec);
  const bad = spec();
  bad.ui.elements.table = { type: "Table", props: { rows: { $state: "/sources/contacts" }, columns: [{ key: "name", label: "Name" }], selectPath: "selected" }, children: [] };
  assert.ok((await validateAppSpec(bad, context())).issues.some((issue) => issue.path === "ui.elements.table.props.selectPath"), "a select path must start with /");
});

test("selecting a row with setState and $item is rejected in favour of selectPath", async () => {
  const input = spec();
  input.ui.elements.main = { type: "Stack", props: {}, children: ["card", "form", "rows"] };
  input.ui.elements.rows = { type: "Stack", props: {}, children: ["name"], repeat: { statePath: "/sources/contacts" } };
  input.ui.elements.name = { type: "Button", props: { label: { $item: "name" } }, children: [], on: { press: { action: "setState", params: { statePath: "/selected", value: { $item: "" } } } } };
  const result = await validateAppSpec(input, context());
  assert.ok(result.issues.some((issue) => issue.path === "ui.elements.name.on.press" && /selectPath/.test(issue.message)), JSON.stringify(result.issues));
});

test("Tabs, Kanban and editable columns validate, and their move and edit actions must be declared", async () => {
  const input = spec();
  input.ui.elements.main = { type: "Tabs", props: { tabs: [{ id: "board", label: "Board" }, { id: "table", label: "Table" }], selectPath: "/view" }, children: ["board", "card"] };
  input.ui.elements.board = { type: "Kanban", props: { rows: { $state: "/sources/contacts" }, groupBy: "stage", columns: [{ value: "lead", label: "Lead" }, { value: "customer", label: "Customer" }],
    title: "name", moveAction: "ticket" }, children: [] };
  input.ui.elements.table = { type: "Table", props: { rows: { $state: "/sources/contacts" }, columns: [{ key: "name", label: "Name", editable: true }], editAction: "ticket", rowAction: "ticket" }, children: [] };
  assert.deepEqual((await validateAppSpec(input, context())).issues, []);
  input.ui.elements.board = { type: "Kanban", props: { rows: { $state: "/sources/contacts" }, groupBy: "stage", columns: [{ value: "lead", label: "Lead" }, { value: "customer", label: "Customer" }], title: "name", moveAction: "move" }, children: [] };
  input.ui.elements.table = { type: "Table", props: { rows: { $state: "/sources/contacts" }, columns: [{ key: "name", label: "Name", editable: true }], editAction: "edit" }, children: [] };
  const paths = (await validateAppSpec(input, context())).issues.map((issue) => issue.path);
  assert.ok(paths.includes("ui.elements.board.props.moveAction"), "undeclared move action");
  assert.ok(paths.includes("ui.elements.table.props.editAction"), "undeclared edit action");
});

test("a file source needs a supported extension and its own sample, and leaves connectors out of the spec's connector list", async () => {
  const input = spec({ sources: { sheet: { kind: "file", path: "~/Desktop/leads.xlsx", select: "$", refresh: { kind: "open" } } }, actions: {} });
  input.ui.elements = { main: { type: "Table", props: { rows: { $state: "/sources/sheet" }, columns: [{ key: "name", label: "Name" }] }, children: [] } };
  const issues = (await validateAppSpec(input, context(false))).issues;
  assert.ok(issues.some((issue) => issue.path === "sources.sheet.path" && /csv, tsv, json/.test(issue.message)));
  assert.ok(issues.some((issue) => issue.path === "sources.sheet.select" && /sample_file/.test(issue.message)));
  const csv = spec({ sources: { sheet: { kind: "file", path: "~/Desktop/leads.csv", select: "$", refresh: { kind: "open" } } }, actions: {} });
  csv.ui.elements = input.ui.elements;
  assert.deepEqual((await validateAppSpec(csv, context())).issues, []);
});

test("a paged source may not also set its page argument, and a cursor expression must compile", async () => {
  const bad = spec({ sources: { contacts: { kind: "connector", connectorId: connector().id, tool: "list_contacts", args: { offset: 0 }, select: "results", page: { kind: "offset", arg: "offset", size: 50 }, refresh: { kind: "open" } },
    more: { kind: "connector", connectorId: connector().id, tool: "list_contacts", args: {}, select: "results", page: { kind: "cursor", arg: "cursor", next: "next[" }, refresh: { kind: "open" } } } });
  bad.ui.elements = { main: { type: "Table", props: { rows: { $state: "/sources/contacts" }, columns: [{ key: "name", label: "Name" }], pageSize: 25 }, children: [] } };
  const paths = (await validateAppSpec(bad, context())).issues.map((issue) => issue.path);
  assert.ok(paths.includes("sources.contacts.page.arg"));
  assert.ok(paths.includes("sources.more.page.next"));
});
