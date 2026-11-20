import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTOR_GALLERY } from "@shared/connectors/gallery";
import { galleryTableRows, queryGalleryTable } from "@/components/app/logic/connectorGalleryTable";

const rows = galleryTableRows(CONNECTOR_GALLERY, ["https://mcp.linear.app/mcp/"]);
const names = (query: Parameters<typeof queryGalleryTable>[1]) => queryGalleryTable(rows, query).map((row) => row.entry.name);
const base = { search: "", category: "all" as const, sort: "name" as const, direction: "asc" as const };

test("rows know their category label, whether the service needs its own OAuth app, and whether it is already added", () => {
  const linear = rows.find((row) => row.entry.id === "linear");
  assert.deepEqual([linear?.category, linear?.ownApp, linear?.added], ["Projects", false, true]);
  assert.equal(rows.find((row) => row.entry.id === "gmail")?.ownApp, true);
});

test("search matches name, summary or category; the category filter narrows; sorting flips direction and ties fall back to name", () => {
  assert.deepEqual(names({ ...base, search: "invoices" }), ["Stripe"]);
  assert.ok(names({ ...base, search: "crm" }).includes("HubSpot"), "matches the category label");
  assert.deepEqual(names({ ...base, category: "finance" }), ["Stripe"]);
  const asc = names(base);
  assert.deepEqual(names({ ...base, direction: "desc" }), [...asc].reverse());
  assert.equal(names({ ...base, sort: "status", direction: "desc" })[0], "Linear", "added first when status sorts descending");
  const byCategory = queryGalleryTable(rows, { ...base, sort: "category" });
  assert.equal(byCategory[0]?.entry.category, "email", "categories sort in gallery order");
  const signIn = queryGalleryTable(rows, { ...base, sort: "signIn" });
  assert.equal(signIn[0]?.ownApp, false);
  assert.equal(signIn.at(-1)?.ownApp, true);
});
