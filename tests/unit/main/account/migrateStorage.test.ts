import assert from "node:assert/strict";
import { test } from "node:test";
import { migrateStorage, STORAGE_MIGRATION_MARKER } from "@main/account/migrateStorage";
import type { StorageEntries } from "@main/types/account/storage.types";

test("migration preserves legacy preferences and keeps newer values at the app origin", async () => {
  let saved: StorageEntries = [];
  await migrateStorage({
    readCurrent: async () => [["nora-theme-mode", "light"], ["new-preference", "kept"]],
    readLegacy: async () => [["nora-theme-mode", "dark"], ["nora-user-display-name", "Daniel"], ["thread-layout", "existing-layout"]],
    async writeCurrent(entries) { saved = entries; }
  });
  assert.deepEqual(Object.fromEntries(saved), { "nora-theme-mode": "light", "new-preference": "kept",
    "nora-user-display-name": "Daniel", "thread-layout": "existing-layout", [STORAGE_MIGRATION_MARKER]: "1" });
  assert.equal(saved.at(-1)?.[0], STORAGE_MIGRATION_MARKER);
});
test("completed migration does not reimport stale file-origin settings", async () => {
  await migrateStorage({ readCurrent: async () => [[STORAGE_MIGRATION_MARKER, "1"]],
    async readLegacy() { assert.fail("Old settings should not be read again"); },
    async writeCurrent() { assert.fail("New settings should not be overwritten"); } });
});
test("a failed legacy read propagates without marking migration complete", async () => {
  await assert.rejects(migrateStorage({ readCurrent: async () => [],
    async readLegacy() { throw new Error("unavailable"); },
    async writeCurrent() { assert.fail("Failed reads must not complete migration"); } }), /unavailable/);
});
