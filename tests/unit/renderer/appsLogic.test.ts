import assert from "node:assert/strict";
import test from "node:test";
import { appRows, formatAppValue } from "@/components/app/logic/apps/formatValue";
import { resolveActionArgs } from "@/components/app/logic/apps/resolveActionArgs";
import { boundSourceArgs, changedSourceInputs, resolveSourceInputs } from "@/components/app/logic/apps/sourceInputs";

test("action arguments resolve from the spec, the form state and the clicked row", () => {
  const args = resolveActionArgs({ connectorId: "c", tool: "t", refreshSources: [], args: {
    kind: { kind: "literal", value: "bug" },
    subject: { kind: "state", path: "/form/subject" },
    contactId: { kind: "item", field: "id" },
    missing: { kind: "item", field: "nope" }
  } }, { form: { subject: "Help" } }, { id: "7", name: "Ada" });
  assert.deepEqual(args, { kind: "bug", subject: "Help", contactId: "7", missing: null });
  assert.deepEqual(resolveActionArgs({ connectorId: "c", tool: "t", refreshSources: [], args: { contactId: { kind: "item", field: "id" } } }, {}, undefined), { contactId: null });
});

test("values format by kind and fall back to their text", () => {
  const now = Date.parse("2026-11-19T12:00:00.000Z");
  assert.equal(formatAppValue(1234.5, "number"), (1234.5).toLocaleString());
  assert.equal(formatAppValue("12", "currency", "USD"), new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(12));
  assert.equal(formatAppValue(0.256, "percent"), "25.6%");
  assert.equal(formatAppValue("2026-11-19T11:00:00.000Z", "relative", "USD", now), new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-1, "hour"));
  assert.equal(formatAppValue("not a date", "date"), "not a date");
  assert.equal(formatAppValue({ nested: true }, "text"), "{\"nested\":true}");
  assert.equal(formatAppValue(null, "number"), "");
});

test("only object rows render", () => {
  assert.deepEqual(appRows([{ a: 1 }, "x", null, [1], { b: 2 }]), [{ a: 1 }, { b: 2 }]);
  assert.deepEqual(appRows({ a: 1 }), []);
});

test("bound source arguments are read from app state, and only sources whose inputs changed reload", () => {
  const sources = {
    invoices: { kind: "connector" as const, connectorId: "c", tool: "list_invoices", args: { status: { $state: "/filters/status" }, limit: 50 }, select: "$", refresh: { kind: "open" as const } },
    contacts: { kind: "connector" as const, connectorId: "c", tool: "list_contacts", args: {}, select: "$", refresh: { kind: "open" as const } }
  };
  const bound = boundSourceArgs({ sources });
  assert.deepEqual(bound, { invoices: { status: "/filters/status" } });
  const first = resolveSourceInputs(bound, { filters: { status: "open" } });
  assert.deepEqual(first, { invoices: { status: "open" } });
  assert.deepEqual(changedSourceInputs(null, first), ["invoices"]);
  assert.deepEqual(changedSourceInputs(first, resolveSourceInputs(bound, { filters: { status: "open" } })), []);
  assert.deepEqual(changedSourceInputs(first, resolveSourceInputs(bound, { filters: { status: "paid" } })), ["invoices"]);
  assert.deepEqual(resolveSourceInputs(bound, {}), { invoices: { status: null } });
});
