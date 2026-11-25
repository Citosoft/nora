import assert from "node:assert/strict";
import test from "node:test";
import { connectorIdsForBot } from "@shared/bots/connectorSelection";
import { bot } from "./fixtures";
import type { BotSettings, SharedBotSet } from "@shared/types/bots/bots.types";

const subject = { workspaceId: "w", botId: "ada" };
const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";

test("live connector selection follows effective bot precedence and hidden bots", () => {
  const settings: BotSettings = { global: [bot("ada", { kind: "global" }, { connectorIds: [first] })], workspaces: {} };
  const shared: SharedBotSet[] = [{ workspaceId: "w", bots: [bot("ada", { kind: "workspace", workspaceId: "w", storage: "shared" }, { connectorIds: [second] })], problems: [] }];
  assert.deepEqual(connectorIdsForBot(settings, [], subject), [first]);
  assert.deepEqual(connectorIdsForBot(settings, shared, subject), [second]);
  assert.deepEqual(connectorIdsForBot(settings, shared, { ...subject, workspaceId: "other" }), [first]);
  settings.workspaces.w = { private: [bot("ada", { kind: "workspace", workspaceId: "w", storage: "private" }, { connectorIds: [] })], hidden: [] };
  assert.deepEqual(connectorIdsForBot(settings, shared, subject), []);
  settings.workspaces.w.hidden = ["ada"];
  assert.deepEqual(connectorIdsForBot(settings, shared, subject), []);
});

test("omitted connector ids mean none; missing bots and plain threads get none", () => {
  const settings: BotSettings = { global: [bot("ada")], workspaces: {} };
  assert.deepEqual(connectorIdsForBot(settings, [], subject), [], "bots opt in to connectors");
  assert.deepEqual(connectorIdsForBot(settings, [], { ...subject, botId: "missing" }), []);
  assert.deepEqual(connectorIdsForBot(settings, [], { ...subject, botId: null }), []);
});
