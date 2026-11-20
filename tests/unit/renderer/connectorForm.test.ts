import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_CONNECTOR_FORM, buildConnectorInput, buildConnectorServer, initialAddConnectorStep, presetConnectorForm, resolveAddConnectorStep, suggestConnectorName } from "@/components/app/logic/connectorForm";
import { CONNECTOR_GALLERY } from "@shared/connectors/gallery";
import { bot } from "../shared/bots/fixtures";
import { CONNECTOR_ACCESS_ALL } from "@shared/connectors/access";
import type { ConnectorAccessChoices } from "@/components/app/types/noraConnectors.types";

const CHOICES: ConnectorAccessChoices = { workspaces: [{ kind: "workspace", id: "w", name: "Acme", avatar: { id: "w", name: "Acme" } }],
  bots: [{ kind: "bot", id: "ada", name: "Ada", detail: "All workspaces", avatar: bot("ada").avatar }] };

test("the name defaults to the server's host", () => {
  assert.equal(suggestConnectorName("https://mcp.linear.app/mcp"), "Linear");
  assert.equal(suggestConnectorName("https://api.githubcopilot.com/mcp/"), "Githubcopilot");
  assert.equal(suggestConnectorName("not a url"), "");
  const result = buildConnectorInput({ ...EMPTY_CONNECTOR_FORM, url: "https://mcp.linear.app/mcp" }, CHOICES);
  assert.deepEqual(result, { ok: true, input: { name: "Linear", url: "https://mcp.linear.app/mcp", auth: { kind: "oauth" }, access: CONNECTOR_ACCESS_ALL } });
});

test("remote servers need HTTPS; plain HTTP only for this computer", () => {
  assert.equal(buildConnectorInput({ ...EMPTY_CONNECTOR_FORM, name: "X", url: "http://example.com/mcp" }, CHOICES).ok, false);
  assert.equal(buildConnectorInput({ ...EMPTY_CONNECTOR_FORM, name: "X", url: "http://localhost:3000/mcp" }, CHOICES).ok, true);
});

test("header auth needs a value; a client secret only applies with a client ID", () => {
  assert.deepEqual(buildConnectorInput({ ...EMPTY_CONNECTOR_FORM, name: "X", url: "https://x.dev/mcp", authMode: "header" }, CHOICES),
    { ok: false, message: "Enter the header value" });
  const custom = buildConnectorInput({ ...EMPTY_CONNECTOR_FORM, name: "X", url: "https://x.dev/mcp", clientSecret: "orphan" }, CHOICES);
  assert.deepEqual(custom.ok && custom.input.auth, { kind: "oauth" });
  const withClient = buildConnectorInput({ ...EMPTY_CONNECTOR_FORM, name: "X", url: "https://x.dev/mcp", clientId: " id ", clientSecret: "s" }, CHOICES);
  assert.deepEqual(withClient.ok && withClient.input.auth, { kind: "oauth", clientId: "id", clientSecret: "s" });
});

test("limiting access needs a pick, and the picks go into the request", () => {
  const form = { ...EMPTY_CONNECTOR_FORM, name: "X", url: "https://x.dev/mcp" };
  assert.equal(buildConnectorInput({ ...form, access: { ...form.access, bots: { kind: "only", ids: [] } } }, CHOICES).ok, false);
  const scoped = buildConnectorInput({ ...form, access: { workspaces: { kind: "only", ids: ["w"] }, bots: { kind: "all", ids: ["ada"] } } }, CHOICES);
  assert.deepEqual(scoped.ok && scoped.input.access, { workspaces: { kind: "only", ids: ["w"] }, bots: { kind: "all" } });
});

test("the server step validates on its own, before availability is chosen", () => {
  const form = { ...EMPTY_CONNECTOR_FORM, name: "X", url: "https://x.dev/mcp", access: { workspaces: { kind: "only" as const, ids: [] }, bots: { kind: "all" as const, ids: [] } } };
  assert.deepEqual(buildConnectorServer(form), { ok: true, server: { name: "X", url: "https://x.dev/mcp", auth: { kind: "oauth" } } });
  assert.equal(buildConnectorInput(form, CHOICES).ok, false, "the full request still needs a valid availability");
  assert.deepEqual(buildConnectorServer({ ...form, url: "" }).ok, false);
});

test("moving forward stops at the earliest step with a problem; moving back always works", () => {
  const ready = { ...EMPTY_CONNECTOR_FORM, url: "https://x.dev/mcp" };
  assert.deepEqual(resolveAddConnectorStep(ready, "access"), { step: "access", error: null });
  assert.deepEqual(resolveAddConnectorStep({ ...ready, url: "" }, "auth").step, "server");
  const header = { ...ready, authMode: "header" as const };
  assert.deepEqual(resolveAddConnectorStep(header, "auth"), { step: "auth", error: null }, "the auth step itself can be reached before it is filled in");
  assert.deepEqual(resolveAddConnectorStep(header, "access"), { step: "auth", error: "Enter the header value" });
  assert.deepEqual(resolveAddConnectorStep({ ...header, url: "" }, "server"), { step: "server", error: null });
});

test("a gallery preset fills the server and opens on the sign-in step, where the service's own client can be added", () => {
  const gmail = CONNECTOR_GALLERY.find((entry) => entry.id === "gmail");
  const notion = CONNECTOR_GALLERY.find((entry) => entry.id === "notion");
  assert.ok(gmail && notion);
  const form = presetConnectorForm(gmail);
  assert.equal(form.url, gmail.url);
  assert.equal(form.name, "Gmail");
  assert.equal(form.authMode, "oauth");
  assert.equal(initialAddConnectorStep(gmail), "auth");
  assert.equal(initialAddConnectorStep(null), "server");
  const server = buildConnectorServer({ ...form, clientId: "client-1", clientSecret: "s3cret" });
  assert.ok(server.ok);
  assert.deepEqual(server.server.auth, { kind: "oauth", clientId: "client-1", clientSecret: "s3cret" });
  // Moving on from a preset's sign-in step never bounces back to the server step: the preset's fields are already valid.
  assert.deepEqual(resolveAddConnectorStep(presetConnectorForm(notion), "access"), { step: "access", error: null });
});
