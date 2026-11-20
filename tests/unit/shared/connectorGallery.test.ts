import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTOR_GALLERY, CONNECTOR_GALLERY_CATEGORIES, galleryEntriesNotAdded } from "@shared/connectors/gallery";
import { connectorInputSchema } from "@shared/connectors/contracts";

test("every gallery entry is a distinct https server Nora can add as an OAuth connector, in a known category", () => {
  const ids = new Set<string>(), urls = new Set<string>();
  const categories = new Set(CONNECTOR_GALLERY_CATEGORIES.map((entry) => entry.id));
  for (const entry of CONNECTOR_GALLERY) {
    assert.ok(!ids.has(entry.id), `duplicate id ${entry.id}`); ids.add(entry.id);
    assert.ok(!urls.has(entry.url), `duplicate url ${entry.url}`); urls.add(entry.url);
    assert.ok(categories.has(entry.category), `${entry.id} has an unknown category`);
    assert.ok(connectorInputSchema.safeParse({ name: entry.name, url: entry.url, auth: { kind: "oauth" } }).success, `${entry.id} is not a valid connector input`);
    if (entry.registration === "client") assert.ok(entry.setup, `${entry.id} needs a client but has no setup guide`);
  }
});

test("entries already added by URL are left out, whatever their trailing slash or case", () => {
  const remaining = galleryEntriesNotAdded(["https://mcp.notion.com/mcp/", "HTTPS://MCP.LINEAR.APP/mcp"]);
  const ids = remaining.map((entry) => entry.id);
  assert.ok(!ids.includes("notion") && !ids.includes("linear"));
  assert.equal(remaining.length, CONNECTOR_GALLERY.length - 2);
});
