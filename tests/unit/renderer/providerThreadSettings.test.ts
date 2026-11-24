import assert from "node:assert/strict";
import test from "node:test";
import { PROVIDER_THREAD_SETTINGS, providerThreadSettingsTabs, threadSettingsTabFor } from "@/components/app/logic/providerThreadSettings";
import { SETTINGS_SEARCH_INDEX } from "@/components/app/constants/settingsSearchIndex";

test("only installed providers with settings of their own get a Threads tab", () => {
  assert.deepEqual(providerThreadSettingsTabs(["codex", "claude"]), ["claude"]);
  assert.deepEqual(providerThreadSettingsTabs(["codex"]), [], "only All providers when no installed provider has settings of its own");
});

test("a search result opens the tab holding its setting: a provider's tab, or All providers for shared ones", () => {
  assert.equal(threadSettingsTabFor("Suggested replies"), "claude");
  assert.equal(threadSettingsTabFor("Idle chat compaction"), "claude");
  assert.equal(threadSettingsTabFor("Automatic thread titles"), "all");
});

test("every provider tab setting can be found by settings search", () => {
  const indexed = new Set(SETTINGS_SEARCH_INDEX.filter((entry) => entry.group === "threads").map((entry) => entry.title));
  for (const titles of Object.values(PROVIDER_THREAD_SETTINGS)) for (const title of titles) assert.ok(indexed.has(title), title);
});
