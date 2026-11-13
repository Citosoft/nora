import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { createSettingsSyncService } from "@main/settings-sync/service";
import type { SyncDocument, SyncEntries, SettingsSyncApplied } from "@shared/types/settings-sync/sync.types";
import type { SyncSession } from "@main/types/settings-sync/client.types";
import { mergeEntries, settingKeys, encodeSetting } from "@shared/settings-sync/entries";
import { syncAppearance, syncPreferences } from "../../helpers/settingsSync";

test("cloud access stays off until enabled, then disabling stops later sync requests", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-sync-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  let settings = structuredClone(DEFAULT_APP_SETTINGS); let cloud: SyncDocument | null = null; let reads = 0;
  const service = createSettingsSyncService({ path: join(directory, "state.json"), session: () => ({ userId: "user-a", sessionId: "session-a" }),
    readSettings: () => settings, updateSettings: async (change) => { settings = change(settings); return settings; }, providers: () => [],
    onSettingsApplied() {}, notify() {}, applied() {},
    client: { read: async () => { reads++; return cloud; }, write: async (_session, entries) => { cloud = { version: 1, entries: mergeEntries(cloud?.entries ?? {}, entries) }; return cloud; } } });
  context.after(() => service.dispose());
  await service.initialize(); service.sessionChanged(); await service.request({ kind: "appearance", appearance: syncAppearance });
  await service.request({ kind: "sync" }); assert.equal(reads, 0);
  await service.request({ kind: "set-enabled", enabled: true }); await service.request({ kind: "sync" }); assert.equal(reads, 1);
  await service.request({ kind: "set-enabled", enabled: false }); await service.request({ kind: "sync" }); assert.equal(reads, 1);
});
test("switching accounts restores that account's cloud settings without uploading the previous account's preferences", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-sync-")); context.after(() => rm(directory, { recursive: true, force: true }));
  const baseline = syncPreferences(); const remote = { ...baseline, userDisplayName: "Account B", accentColor: "blue" as const };
  const entries: SyncEntries = {};
  for (const key of settingKeys) { const value = encodeSetting(remote, key); if (value !== undefined) entries[key] = { value, updatedAt: 100, deviceId: "device-b" }; }
  await writeFile(join(directory, "state.json"), JSON.stringify({ version: 1, deviceId: "device-a", lastUserId: "user-a", accounts: {
    "user-b": { enabled: true, initialized: true, seedLocal: false, clock: 100, baseline, pending: {}, lastSyncedAt: 100 }
  } }));
  let settings = structuredClone(DEFAULT_APP_SETTINGS); let writes = 0; const applied: SettingsSyncApplied[] = [];
  const service = createSettingsSyncService({ path: join(directory, "state.json"), session: () => ({ userId: "user-b", sessionId: "session-b" }),
    readSettings: () => settings, updateSettings: async (change) => { settings = change(settings); return settings; }, providers: () => [],
    onSettingsApplied() {}, notify() {}, applied: (input) => applied.push(input),
    client: { read: async () => ({ version: 1, entries }), write: async () => { writes++; return { version: 1, entries }; } } });
  context.after(() => service.dispose());
  await service.initialize(); service.sessionChanged(); // Auth may be ready before appearance.
  await service.request({ kind: "appearance", appearance: { ...syncAppearance, userDisplayName: "Account A" } });
  await service.request({ kind: "sync" }); assert.equal(writes, 0); assert.equal(applied.at(-1)?.values.userDisplayName, "Account B");
});
test("signing out cancels an in-flight sync before any cloud settings are applied", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-sync-")); context.after(() => rm(directory, { recursive: true, force: true }));
  let session: SyncSession | null = { userId: "user-a", sessionId: "session-a" };
  let release: (value: SyncDocument | null) => void = () => {};
  let started: () => void = () => {};
  const reading = new Promise<void>((resolve) => { started = resolve; });
  let applies = 0;
  const service = createSettingsSyncService({ path: join(directory, "state.json"), session: () => session,
    readSettings: () => DEFAULT_APP_SETTINGS, updateSettings: async (change) => change(DEFAULT_APP_SETTINGS), providers: () => [],
    onSettingsApplied() { applies++; }, notify() {}, applied() {},
    client: { read: () => new Promise((resolve) => { release = resolve; started(); }), write: async () => { assert.fail("A cancelled sync must not upload"); } } });
  context.after(() => service.dispose());
  await service.initialize(); service.sessionChanged(); await service.request({ kind: "appearance", appearance: syncAppearance });
  await service.request({ kind: "set-enabled", enabled: true }); const pending = service.request({ kind: "sync" });
  await reading; session = null; service.sessionChanged(); release(null); const state = await pending;
  assert.equal(applies, 0); assert.equal(state.phase, "signed-out");
});
