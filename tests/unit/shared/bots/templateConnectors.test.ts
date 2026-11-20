import assert from "node:assert/strict";
import test from "node:test";
import { BOT_TEMPLATES } from "@shared/bots/templates";
import { templateConnectorIds, templateConnectorMatches } from "@shared/bots/templateConnectors";
import { CONNECTOR_GALLERY } from "@shared/connectors/gallery";
import { CONNECTOR_ACCESS_ALL } from "@shared/connectors/access";
import type { Connector } from "@shared/types/connectors/connectors.types";

const template = BOT_TEMPLATES.find((entry) => entry.id === "code-reviewer");
assert.ok(template);
const github: Connector = { id: "00000000-0000-4000-8000-000000000001", name: "Renamed work account", url: "https://api.githubcopilot.com/mcp", serverName: "work",
  enabled: true, auth: { kind: "oauth", customClient: false, signedIn: true }, access: CONNECTOR_ACCESS_ALL, status: "connected", tools: [] };
const notion: Connector = { ...github, id: "00000000-0000-4000-8000-000000000002", url: "https://mcp.notion.com/mcp", name: "Notes" };

test("all catalog templates have distinct, valid connector recommendations", () => {
  const galleryIds = new Set(CONNECTOR_GALLERY.map((entry) => entry.id));
  for (const entry of BOT_TEMPLATES) {
    assert.ok(entry.connectorGalleryIds.length > 0, entry.id);
    assert.equal(new Set(entry.connectorGalleryIds).size, entry.connectorGalleryIds.length, entry.id);
    assert.ok(entry.connectorGalleryIds.every((id) => galleryIds.has(id)), entry.id);
  }
});

test("template defaults match server identity, include pending sign-ins, and exclude unrelated services", () => {
  assert.deepEqual(templateConnectorIds(template, [github, notion]), [github.id]);
  assert.deepEqual(templateConnectorIds(template, [{ ...github, status: "needs-auth" }]), [github.id]);
  const matches = templateConnectorMatches(template, [github, notion]);
  assert.equal(matches[0]?.entry.id, "github");
  assert.deepEqual(matches[0]?.connectors.map((connector) => connector.id), [github.id]);
  assert.deepEqual(templateConnectorIds(template, [notion]), []);
  assert.deepEqual(templateConnectorMatches(template, [notion])[0]?.connectors, []);
});

test("multiple accounts require a choice, and disabled or restricted accounts are not preassigned", () => {
  const other = { ...github, id: "00000000-0000-4000-8000-000000000003" };
  assert.deepEqual(templateConnectorIds(template, [github, other]), []);
  assert.deepEqual(templateConnectorIds(template, [{ ...github, enabled: false }]), []);
  const subject = { workspaceId: "w", botId: null };
  const restricted: Connector = { ...github, access: { ...CONNECTOR_ACCESS_ALL, workspaces: { kind: "only", ids: ["elsewhere"] } } };
  assert.deepEqual(templateConnectorIds(template, [restricted], subject), []);
  assert.deepEqual(templateConnectorIds(template, [restricted, other], subject), [other.id]);
  assert.deepEqual(templateConnectorIds(template, [{ ...github, access: { ...CONNECTOR_ACCESS_ALL, bots: { kind: "only", ids: ["existing-bot"] } } }], subject), []);
});
