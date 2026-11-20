import assert from "node:assert/strict";
import test from "node:test";
import { appFileSourceLabel, reviewAppImport } from "@/components/app/logic/apps/importReview";
import type { AppFile } from "@shared/types/apps/portable.types";
import type { Connector } from "@shared/types/connectors/connectors.types";

const local = (id: string, url: string): Connector => ({ id, name: id, url } as unknown as Connector);

const file = (connectors: AppFile["connectors"], actions: number, filePath?: string): AppFile => ({
  format: "nora-app", formatVersion: 1, name: "Deals", exportedAt: "2026-11-20T00:00:00.000Z", connectors,
  spec: {
    sources: filePath ? { notes: { kind: "file", path: filePath } } : {},
    actions: Object.fromEntries(Array.from({ length: actions }, (_, index) => [`a${index}`, { connectorId: "crm", tool: "update", label: "Update" }]))
  }
} as unknown as AppFile);

test("each connector is reused when one is chosen, added when portable, and needs setup otherwise", () => {
  const review = reviewAppImport(file({
    crm: { name: "CRM", url: "https://crm.example.com/mcp", auth: { kind: "oauth", customClient: false } },
    mail: { name: "Mail", url: "https://mail.example.com/mcp", auth: { kind: "oauth", customClient: false } },
    keyed: { name: "Keyed", url: "https://keyed.example.com/mcp", auth: { kind: "header", name: "X-Key" } }
  }, 2, "/tmp/notes.csv"), [local("local-crm", "https://crm.example.com/mcp")], { crm: "local-crm", mail: null });
  assert.deepEqual(review.connectors.map((entry) => entry.state), ["reused", "added", "setup"]);
  assert.equal(review.needsSetup, 1);
  assert.equal(review.actionCount, 2);
  assert.deepEqual(review.localFiles, ["/tmp/notes.csv"]);
});

test("a connector's logo comes from the gallery when listed and from its site otherwise", () => {
  const review = reviewAppImport(file({
    notion: { name: "Notion", url: "https://mcp.notion.com/mcp/" },
    crm: { name: "CRM", url: "https://mcp.crm.example.com/mcp" },
    lost: { name: "Lost", url: "" }
  }, 0), [], {});
  assert.deepEqual(review.connectors.map((entry) => entry.logo), [{ kind: "domain", domain: "notion.so" }, { kind: "domain", domain: "crm.example.com" }, undefined]);
});

test("only connectors on the same server are offered in place of one the app names", () => {
  const crm = local("crm-1", "https://crm.example.com/mcp/");
  const crmTwo = local("crm-2", "https://crm.example.com/mcp");
  const unrelated = local("notion", "https://mcp.notion.com/mcp");
  const review = reviewAppImport(file({
    crm: { name: "CRM", url: "https://crm.example.com/mcp", auth: { kind: "oauth", customClient: false } },
    legacy: { name: "Legacy", url: "" }
  }, 0), [crm, crmTwo, unrelated], { crm: "notion", legacy: "notion" });
  const [crmEntry, legacyEntry] = review.connectors;
  assert.deepEqual(crmEntry?.candidates.map((entry) => entry.id), ["crm-1", "crm-2"]);
  assert.equal(crmEntry?.chosen, null, "a connector to another server is never treated as the choice");
  assert.equal(crmEntry?.state, "added");
  assert.deepEqual(legacyEntry?.candidates.map((entry) => entry.id), ["crm-1", "crm-2", "notion"], "a file that recorded no server can use any connector");
  assert.equal(legacyEntry?.state, "reused");
});

test("the source reads as the Nora directory, another site's host, or the local file name", () => {
  assert.equal(appFileSourceLabel("https://www.withnora.run/apps/files/abc.nora-app.json"), "Nora app directory");
  assert.equal(appFileSourceLabel("https://example.com/deals.nora-app.json"), "example.com");
  assert.equal(appFileSourceLabel("/Users/me/Downloads/deals.nora-app.json"), "deals.nora-app.json");
  assert.equal(appFileSourceLabel("C:\\Users\\me\\deals.nora-app.json"), "deals.nora-app.json");
});
