import assert from "node:assert/strict";
import { test } from "node:test";
import { syncSettings } from "@main/settings-sync/engine";
import { syncFixture } from "../../helpers/settingsSync";
import { decodeEntries, newer } from "@shared/settings-sync/entries";

test("first sync seeds an empty account and later devices restore cloud preferences", async () => {
  const first = syncFixture(); first.edit({ themeMode: "dark", accentColor: "blue" });
  first.journal.baseline = first.local();
  await syncSettings(first.deps);
  assert.equal(decodeEntries(first.cloud()?.entries ?? {}).themeMode, "dark");
  assert.equal(Object.keys(first.journal.pending).length, 0);
  const second = syncFixture(); second.setCloud(first.cloud());
  await syncSettings(second.deps);
  assert.equal(second.local().themeMode, "dark"); assert.equal(second.local().accentColor, "blue");
  assert.equal(second.writes(), 0);
});
test("independent local and cloud settings merge rather than replacing a whole profile", async () => {
  const fixture = syncFixture(); await syncSettings(fixture.deps);
  const cloud = fixture.cloud(); assert.ok(cloud);
  fixture.setCloud({ version: 1, entries: { ...cloud.entries, uiFontId: { value: '"inter"', updatedAt: 2000, deviceId: "device-b" } } });
  fixture.edit({ themeMode: "light" }); await syncSettings(fixture.deps);
  assert.equal(fixture.local().uiFontId, "inter"); assert.equal(fixture.local().themeMode, "light");
});
test("offline edits remain queued after a failed request and are sent on retry", async () => {
  const fixture = syncFixture(); await syncSettings(fixture.deps);
  fixture.edit({ themeMode: "dark" });
  const read = fixture.deps.client.read;
  fixture.deps.client.read = async () => { throw new Error("offline"); };
  await assert.rejects(syncSettings(fixture.deps), /offline/);
  assert.equal(fixture.journal.pending.themeMode?.value, '"dark"');
  fixture.deps.client.read = read; await syncSettings(fixture.deps);
  assert.equal(decodeEntries(fixture.cloud()?.entries ?? {}).themeMode, "dark");
  assert.equal(fixture.journal.pending.themeMode, undefined);
});
test("edits made during upload survive and stay pending for another pass", async () => {
  const fixture = syncFixture(); await syncSettings(fixture.deps);
  const write = fixture.deps.client.write;
  fixture.deps.client.write = async (...args) => { fixture.edit({ themeMode: "light" }); return write(...args); };
  fixture.edit({ themeMode: "dark" }); await syncSettings(fixture.deps);
  assert.equal(fixture.local().themeMode, "light");
  assert.equal(fixture.journal.pending.themeMode?.value, '"light"');
});
test("known future clock revisions do not permanently prevent new local edits", async () => {
  const fixture = syncFixture(); await syncSettings(fixture.deps);
  const cloud = fixture.cloud(); assert.ok(cloud);
  fixture.setCloud({ version: 1, entries: { ...cloud.entries, themeMode: { value: '"dark"', updatedAt: 1_000_000, deviceId: "future-clock" } } });
  await syncSettings(fixture.deps); fixture.edit({ themeMode: "light" }); await syncSettings(fixture.deps);
  assert.equal(decodeEntries(fixture.cloud()?.entries ?? {}).themeMode, "light");
});
test("account changes abort a response before applying it locally", async () => {
  const fixture = syncFixture();
  fixture.deps.client.read = async () => { fixture.controller.abort(); return { version: 1, entries: { themeMode: { value: '"dark"', updatedAt: 10, deviceId: "remote" } } }; };
  await assert.rejects(syncSettings(fixture.deps)); assert.equal(fixture.local().themeMode, "system");
});
test("same-setting ties resolve consistently by device identity", () => {
  const left = { value: '"light"', updatedAt: 100, deviceId: "b" };
  const right = { value: '"dark"', updatedAt: 100, deviceId: "a" };
  assert.equal(newer(left, right), true); assert.equal(newer(right, left), false);
});
