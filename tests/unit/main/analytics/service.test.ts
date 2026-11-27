import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createAnalyticsService } from "@main/helpers/analytics/service";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import type { AppSettings } from "@shared/appTypes";
import type { AnalyticsServiceDeps } from "@main/types/analytics/analytics.types";

async function fixture(t: test.TestContext, countryCode: string | null, settings: Partial<AppSettings> = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "nora-analytics-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sent: Array<{ event: string; properties: Record<string, unknown> }> = [];
  let current: AppSettings = { ...DEFAULT_APP_SETTINGS, ...settings };
  const deps: AnalyticsServiceDeps = {
    config: { apiKey: "token" }, statePath: path.join(directory, "installation.json"), runtimeAllowed: true,
    context: { appVersion: "2.0.7", environment: "production", platform: "linux", arch: "x64", osVersion: "6", countryCode, locale: "en" },
    readSettings: () => current, log: () => undefined,
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { batch: typeof sent };
      sent.push(...body.batch);
      return new Response("{}", { status: 200 });
    }
  };
  return { deps, sent, statePath: deps.statePath, update: (next: Partial<AppSettings>) => { const previous = current; current = { ...current, ...next }; return previous; },
    read: () => current };
}

test("in a consent region nothing is stored or sent until the user opts in", async (t) => {
  const f = await fixture(t, "DE");
  const service = createAnalyticsService(f.deps);
  await service.start();
  await service.shutdown();
  assert.equal(f.sent.length, 0);
  await assert.rejects(access(f.statePath));

  const later = createAnalyticsService(f.deps);
  await later.start();
  const previous = f.update({ analyticsConsentStatus: "granted" });
  await later.settingsSaved(previous, f.read());
  await later.shutdown();
  assert.deepEqual(f.sent.map((event) => event.event), ["app.launched", "settings.changed", "app.session_ended"]);
  assert.equal(f.sent[0]?.properties.isFirstLaunch, true);
});

test("in an opt-out region launches count unique installs once, and objecting stops everything", async (t) => {
  const f = await fixture(t, "GB");
  await createAnalyticsService(f.deps).start();
  const second = createAnalyticsService(f.deps);
  await second.start();
  assert.deepEqual(f.sent.map((event) => [event.event, event.properties.isFirstLaunch]), [["app.launched", true], ["app.launched", false]]);
  const state = JSON.parse(await readFile(f.statePath, "utf8")) as { installationId: string };
  assert.ok(f.sent.every((event) => event.properties.distinct_id === state.installationId));

  const previous = f.update({ usageStatisticsEnabled: false, analyticsConsentStatus: "declined" });
  await second.settingsSaved(previous, f.read());
  second.recordFromRenderer({ name: "view.opened", properties: { view: "sidebar:bots" } });
  await second.shutdown();
  assert.equal(f.sent.length, 2);
});

test("an unreadable installation ID is never replaced, so installs are not double counted", async (t) => {
  const f = await fixture(t, "US");
  await writeFile(f.statePath, "not json");
  await createAnalyticsService(f.deps).start();
  assert.equal(f.sent.length, 0);
  assert.equal(await readFile(f.statePath, "utf8"), "not json");
});
