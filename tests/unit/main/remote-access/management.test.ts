import assert from "node:assert/strict";
import test from "node:test";
import { botSettingsResponseSchema, remoteSettingsSchema } from "@shared/remote-access/management";
import { putStoredBot } from "@shared/bots/settingsMutations";
import { runtimeInfoSchema } from "@shared/remote-access/runtimeApi";
import type { SaveRemoteBot } from "@shared/types/remote-access/management.types";
import { runtimeFixture } from "./runtimeFixture";

const input: SaveRemoteBot = { id: "mobile-bot", name: "Mobile bot", role: "Reviewer", instructions: "Review changes.",
  scope: { kind: "global" }, revision: null, avatar: { seed: 42, palette: "teal" } };

function enableManagement(f: ReturnType<typeof runtimeFixture>): void {
  f.options.management = { async request(request) {
    if (request.kind === "set-thread-preferences") f.boot.personalization.threads = { ...f.boot.personalization.threads, ...request.patch };
    if (request.kind === "save-bot") {
      const previous = f.boot.personalization.bots?.global.find((bot) => bot.id === request.bot.id);
      f.boot.personalization.bots = putStoredBot(f.boot.personalization.bots, { ...request.bot, revision: (previous?.revision ?? 0) + 1 });
    }
    return f.boot;
  } };
}

test("management capabilities require a host settings port and retain owner authentication", async (t) => {
  const f = runtimeFixture(t);
  assert.equal(runtimeInfoSchema.parse(await (await f.request("/v1/runtime/info")).json()).capabilities.includes("bots.manage"), false);
  assert.equal((await f.request("/v1/settings")).status, 503);
  enableManagement(f);
  assert.equal(runtimeInfoSchema.parse(await (await f.request("/v1/runtime/info")).json()).capabilities.includes("bots.manage"), true);
  for (const route of ["/v1/settings", "/v1/bot-settings"]) {
    assert.equal((await f.request(route, undefined, { Authorization: "" })).status, 401);
    assert.equal((await f.request(route, route.endsWith("settings") ? { automaticTitles: false } : input,
      { Authorization: "Bearer other.token.signature" })).status, 403);
  }
});

test("remote preferences expose only approved fields and merge a small patch", async (t) => {
  const f = runtimeFixture(t); enableManagement(f);
  const before = remoteSettingsSchema.parse(await (await f.request("/v1/settings")).json());
  const response = await f.request("/v1/settings", { automaticTitles: !before.automaticTitles });
  assert.equal(response.status, 200);
  assert.deepEqual(remoteSettingsSchema.parse(await response.json()), { ...before, automaticTitles: !before.automaticTitles });
  assert.equal((await f.request("/v1/settings", { ai: { apiKeys: {} } })).status, 400);
  assert.equal((await f.request("/v1/settings", {})).status, 400);
});

test("mobile bot creation resolves safe defaults; editing preserves binding and connections and rejects stale drafts", async (t) => {
  const f = runtimeFixture(t); enableManagement(f);
  const response = await f.request("/v1/bot-settings", input);
  assert.equal(response.status, 200);
  const created = botSettingsResponseSchema.parse(await response.json()).bots[0];
  assert.ok(created);
  assert.equal(created.binding.model, "test-model");
  assert.equal(created.binding.permissionPolicy, "native-default");
  assert.deepEqual(created.avatar, input.avatar);
  created.connectorIds = ["58cafc5b-f5c9-4bd2-b54f-292888682ce5"];
  f.boot.personalization.bots = putStoredBot(f.boot.personalization.bots, created);
  const update = { ...input, revision: created.revision, instructions: "Updated guidance." };
  const edited = botSettingsResponseSchema.parse(await (await f.request("/v1/bot-settings", update)).json()).bots[0];
  assert.ok(edited);
  assert.equal(edited.instructions, update.instructions);
  assert.deepEqual(edited.binding, created.binding);
  assert.deepEqual(edited.connectorIds, ["58cafc5b-f5c9-4bd2-b54f-292888682ce5"]);
  assert.equal(edited.revision, 2);
  assert.equal((await f.request("/v1/bot-settings", update)).status, 409);
  assert.equal((await f.request("/v1/bot-settings", input)).status, 409);
  assert.equal((await f.request("/v1/bot-settings", { ...input, id: "nora" })).status, 400);
  assert.equal((await f.request("/v1/bot-settings", { ...input, binding: { permissionPolicy: "dangerous" } })).status, 400);
  assert.equal((await f.request("/v1/bot-settings", { ...input, scope: { kind: "workspace", workspaceId: "missing", storage: "private" } })).status, 400);
});
