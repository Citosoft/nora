import { searchSettings } from "@/components/app/logic/settingsSearch";
import type { SettingsSearchEntry } from "@/components/app/types/settingsSearch.types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import assert from "node:assert/strict";
import test from "node:test";

const groups: { value: SettingsGroup; label: string }[] = [
  { value: "appearance", label: "Appearance" },
  { value: "terminal", label: "Terminal" },
  { value: "system", label: "System" }
];

const entries: SettingsSearchEntry[] = [
  { group: "appearance", title: "Color Theme", keywords: ["dark", "light"] },
  { group: "appearance", title: "Terminal Font", keywords: ["monospace"] },
  { group: "terminal", title: "Default Shell", keywords: ["zsh"] },
  { group: "system", title: "Hardware Acceleration", keywords: ["gpu"] }
];

test("blank queries return null so the full navigation shows", () => {
  assert.equal(searchSettings(groups, entries, ""), null);
  assert.equal(searchSettings(groups, entries, "   "), null);
});

test("matches setting titles and keywords case-insensitively, keeping group order", () => {
  const results = searchSettings(groups, entries, "DARK");
  assert.deepEqual(results, [{ group: groups[0], entries: [entries[0]] }]);
});

test("a matching group label shows the group alongside settings matched elsewhere", () => {
  const results = searchSettings(groups, entries, "terminal");
  assert.deepEqual(results, [
    { group: groups[0], entries: [entries[1]] },
    { group: groups[1], entries: [] }
  ]);
});

test("every query token must match", () => {
  assert.deepEqual(searchSettings(groups, entries, "terminal mono"), [{ group: groups[0], entries: [entries[1]] }]);
  assert.deepEqual(searchSettings(groups, entries, "gpu zsh"), []);
});

test("entries for groups that are not listed are ignored", () => {
  assert.deepEqual(searchSettings(groups.slice(0, 1), entries, "gpu"), []);
});
