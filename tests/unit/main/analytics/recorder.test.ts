import assert from "node:assert/strict";
import test from "node:test";
import { createAnalyticsRecorder } from "@main/helpers/analytics/recorder";
import { createPostHogTransport } from "@main/helpers/analytics/transport";
import type { AnalyticsLevel } from "@shared/types/analytics.types";
import type { AnalyticsContext } from "@main/types/analytics/analytics.types";

const context: AnalyticsContext = {
  appVersion: "2.0.7", environment: "production", platform: "darwin", arch: "arm64", osVersion: "25", countryCode: "GB", locale: "en-GB"
};

function fixture(initialLevel: AnalyticsLevel, responses: number[] = [], environment: AnalyticsContext["environment"] = "production") {
  let level = initialLevel;
  const bodies: unknown[] = [];
  const transport = createPostHogTransport({
    config: { apiKey: "token" },
    fetch: async (url, init) => {
      assert.equal(String(url), "https://eu.i.posthog.com/batch/");
      assert.equal(init?.redirect, "error");
      bodies.push(JSON.parse(String(init?.body)));
      return new Response("{}", { status: responses.shift() ?? 200 });
    }
  });
  let id = 0;
  const recorder = createAnalyticsRecorder({
    transport, context: { ...context, environment }, sessionId: "session", getLevel: () => level,
    getInstallation: () => ({ installationId: "install-1", isFirstLaunch: false }),
    now: () => new Date("2026-11-27T10:00:00.000Z"), nextId: () => `event-${++id}`
  });
  return { recorder, transport, bodies, setLevel: (next: AnalyticsLevel) => { level = next; } };
}

test("anonymous events carry only coarse context, never an IP, and no person profile", async () => {
  const { recorder, bodies } = fixture("anonymous");
  recorder.record({ name: "app.launched", properties: { isFirstLaunch: true } });
  assert.equal(await recorder.flush(), true);
  assert.deepEqual(bodies, [{
    api_key: "token",
    batch: [{
      uuid: "event-1", event: "app.launched", timestamp: "2026-11-27T10:00:00.000Z",
      properties: {
        isFirstLaunch: true, distinct_id: "install-1", $session_id: "session", $lib: "nora-desktop", $lib_version: "2.0.7",
        appVersion: "2.0.7", environment: "production", platform: "darwin", arch: "arm64", osVersion: "25", countryCode: "GB",
        locale: "en-GB", analyticsLevel: "anonymous", $process_person_profile: false, $geoip_disable: true, $ip: null
      }
    }]
  }]);
});

test("detailed events are dropped without opt-in and error text only travels, scrubbed, with it", async () => {
  const anonymous = fixture("anonymous");
  const error = { source: "ipc", errorName: "Error", errorCode: null, context: "app:read-workspace-file",
    message: "cannot open /Users/jane/acme/plan.md", stack: "Error\n    at read (/Users/jane/dist/main/files.js:1:1)" } as const;
  anonymous.recorder.record({ name: "view.opened", properties: { view: "settings:privacy" } });
  anonymous.recorder.record({ name: "error.occurred", properties: error });
  await anonymous.recorder.flush();
  const [anonymousBody] = anonymous.bodies as Array<{ batch: Array<{ event: string; properties: Record<string, unknown> }> }>;
  assert.deepEqual(anonymousBody?.batch.map((event) => event.event), ["error.occurred"]);
  assert.equal("message" in (anonymousBody?.batch[0]?.properties ?? {}), false);
  assert.equal("stack" in (anonymousBody?.batch[0]?.properties ?? {}), false);

  const detailed = fixture("detailed");
  detailed.recorder.record({ name: "error.occurred", properties: error });
  await detailed.recorder.flush();
  const [detailedBody] = detailed.bodies as Array<{ batch: Array<{ properties: Record<string, unknown> }> }>;
  assert.equal(detailedBody?.batch[0]?.properties.message, "cannot open <path>");
  assert.equal(detailedBody?.batch[0]?.properties.stack, "at read (files.js:1:1)");
  assert.equal(detailedBody?.batch[0]?.properties.$process_person_profile, true);
});

test("nothing is recorded while off, and narrowing the level discards what was queued", async () => {
  const { recorder, transport, bodies, setLevel } = fixture("off");
  recorder.record({ name: "app.launched", properties: { isFirstLaunch: false } });
  assert.equal(transport.pending(), 0);
  setLevel("detailed");
  recorder.levelChanged();
  recorder.record({ name: "view.opened", properties: { view: "sidebar:bots" } });
  setLevel("anonymous");
  recorder.levelChanged();
  assert.equal(transport.pending(), 0);
  await recorder.flush();
  assert.deepEqual(bodies, []);
});

test("failed sends keep events for the next flush and batches respect the size cap", async () => {
  const { recorder, transport, bodies } = fixture("anonymous", [500]);
  recorder.record({ name: "app.session_ended", properties: { durationSeconds: 5 } });
  assert.equal(await recorder.flush(), false);
  assert.equal(transport.pending(), 1);
  assert.equal(await recorder.flush(), true);
  assert.equal(transport.pending(), 0);
  assert.equal(bodies.length, 2);
});


test("development builds prefix event names so they stay out of production insights", async () => {
  const { recorder, bodies } = fixture("anonymous", [], "development");
  recorder.record({ name: "turn.started", properties: { provider: "claude", model: null, effort: null, connection: "api", origin: "thread", action: "turn" } });
  await recorder.flush();
  const [body] = bodies as Array<{ batch: Array<{ event: string; properties: Record<string, unknown> }> }>;
  assert.equal(body?.batch[0]?.event, "[DEV] turn.started");
  assert.equal(body?.batch[0]?.properties.environment, "development");
});
