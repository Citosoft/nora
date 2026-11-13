import assert from "node:assert/strict";
import { test } from "node:test";
import { metadataSchema, prepareCloudPatch, readCloudDocument } from "@main/settings-sync/cloudDocument";
import type { SyncEntry } from "@shared/types/settings-sync/sync.types";

const revision = (value: string, time: number, deviceId: string): SyncEntry => ({ value: JSON.stringify(value), updatedAt: time, deviceId });
test("concurrent same-setting writes keep both revisions and deterministically select the latest", () => {
  const a = prepareCloudPatch({}, { themeMode: revision("dark", 10, "a") });
  const b = prepareCloudPatch({}, { themeMode: revision("light", 11, "b") });
  const metadata = metadataSchema.parse({ noraSettingsSync: { version: 1, entries: { themeMode: { ...b.themeMode, ...a.themeMode } } } });
  assert.equal(readCloudDocument(metadata).document?.entries.themeMode?.value, '"light"');
  const cleanup = prepareCloudPatch(metadata, {});
  assert.equal(cleanup.themeMode?.["a:a"], null);
  assert.equal(cleanup.themeMode?.["b:b"], undefined);
});
test("nullable settings are JSON strings so Clerk's deep-merge deletion rules cannot corrupt them", () => {
  const patch = prepareCloudPatch({}, { threadModel: { value: "null", updatedAt: 1, deviceId: "a" } });
  assert.equal(patch.threadModel?.["1:a"]?.value, "null");
});
test("unknown future settings and unrelated metadata are left untouched", () => {
  const metadata = metadataSchema.parse({ anotherApp: { theme: "old" }, noraSettingsSync: { version: 1, entries: { futureOption: { "1:a": revision("future", 1, "a") } } } });
  assert.equal(prepareCloudPatch(metadata, { themeMode: revision("dark", 2, "a") }).futureOption, undefined);
  assert.deepEqual(metadata.anotherApp, { theme: "old" });
});
test("unsupported documents and invalid preferences are refused without a write", () => {
  assert.throws(() => prepareCloudPatch({ noraSettingsSync: { version: 3, entries: {} } }, {}), /unsupported/);
  assert.throws(() => readCloudDocument(metadataSchema.parse({ noraSettingsSync: { version: 1, entries: { themeMode: { "1:a": revision("not-a-theme", 1, "a") } } } })), /invalid values/);
});
test("the first cloud format migrates without losing saved settings or timestamps", () => {
  const original = revision("dark", 100, "first-device");
  const metadata = metadataSchema.parse({ noraSettingsSync: { version: 1, entries: { themeMode: original } }, anotherApp: "keep" });
  const parsed = readCloudDocument(metadata);
  assert.equal(parsed.document?.entries.themeMode?.value, '"dark"');
  assert.deepEqual(parsed.legacyFields, ["themeMode"]);
  const patch = prepareCloudPatch(metadata, {});
  assert.deepEqual(patch.themeMode?.["2s:first-device"], original);
  assert.equal(patch.themeMode?.value, null); assert.equal(patch.themeMode?.updatedAt, null); assert.equal(patch.themeMode?.deviceId, null);
});
test("a legacy writer and a revised writer can coexist during cloud migration", () => {
  const metadata = metadataSchema.parse({ noraSettingsSync: { version: 1, entries: { themeMode: {
    ...revision("dark", 100, "old"), "2t:new": revision("light", 101, "new")
  } } } });
  assert.equal(readCloudDocument(metadata).document?.entries.themeMode?.value, '"light"');
});
test("metadata budgets include other applications' data", () => {
  assert.throws(() => prepareCloudPatch({ anotherApp: "x".repeat(7000) }, { themeMode: revision("dark", 1, "a") }), /storage is full/);
});
