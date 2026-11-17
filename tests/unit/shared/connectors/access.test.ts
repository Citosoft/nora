import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTOR_ACCESS_ALL, connectorAvailableTo, connectorSubjectOf } from "@shared/connectors/access";
import { connectorAccessSchema } from "@shared/connectors/contracts";
import type { ConnectorAccess } from "@shared/types/connectors/connectors.types";

const plain = { workspaceId: "w", botId: null };
const ada = { workspaceId: "w", botId: "ada" };

test("the default reaches every workspace and every thread", () => {
  assert.equal(connectorAvailableTo(CONNECTOR_ACCESS_ALL, plain), true);
  assert.equal(connectorAvailableTo(CONNECTOR_ACCESS_ALL, { workspaceId: "other", botId: "grace" }), true);
});

test("a thread needs both an allowed workspace and, when bots are limited, to be one of those bots", () => {
  const acmeOnly: ConnectorAccess = { workspaces: { kind: "only", ids: ["w"] }, bots: { kind: "all" } };
  assert.equal(connectorAvailableTo(acmeOnly, plain), true);
  assert.equal(connectorAvailableTo(acmeOnly, { workspaceId: "other", botId: null }), false);
  const adaOnly: ConnectorAccess = { workspaces: { kind: "all" }, bots: { kind: "only", ids: ["ada"] } };
  assert.equal(connectorAvailableTo(adaOnly, ada), true);
  assert.equal(connectorAvailableTo(adaOnly, plain), false, "plain threads are left out once bots are limited");
  assert.equal(connectorAvailableTo(adaOnly, { workspaceId: "w", botId: "grace" }), false);
  assert.equal(connectorAvailableTo({ ...adaOnly, workspaces: { kind: "only", ids: ["other"] } }, ada), false);
});

test("an empty list is never a valid rule, since it would reach no thread", () => {
  assert.equal(connectorAccessSchema.safeParse({ workspaces: { kind: "only", ids: [] }, bots: { kind: "all" } }).success, false);
  assert.equal(connectorAccessSchema.safeParse({ workspaces: { kind: "all" }, bots: { kind: "only", ids: ["Not A Bot Id"] } }).success, false);
});

test("a thread's subject is its workspace and bot", () => {
  const workspace = { environmentId: "local", projectId: "w", checkoutId: "c", path: "/w", branch: "main", access: "write" as const };
  assert.deepEqual(connectorSubjectOf({ workspace }), plain);
});
