import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { z } from "zod";
import { trackInstallationLaunch } from "@main/helpers/analytics/launch";
import { readAnalyticsConfig } from "@main/helpers/analytics/config";
import type { LaunchTrackingInput } from "@main/types/analytics/launch.types";

const stateSchema = z.object({ installationId: z.string().uuid(), reported: z.boolean() });

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "nora-launch-"));
  const requests: Request[] = [];
  const input: LaunchTrackingInput = {
    allowed: true,
    config: { apiKey: "test-token", host: "https://eu.i.posthog.com" },
    statePath: path.join(directory, "installation.json"),
    context: { appVersion: "2.0.2", environment: "production", platform: "darwin", countryCode: "GB" },
    fetch: async (url, options) => {
      requests.push(new Request(url, options));
      assert.equal(options?.redirect, "error");
      assert.ok(options?.signal);
      return new Response("1", { status: 200 });
    }
  };
  return { directory, requests, input };
}

test("launch counts reuse an installation ID and send only coarse context", async (t) => {
  const { directory, requests, input } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await trackInstallationLaunch(input);
  await trackInstallationLaunch(input);
  // Exact payload checks ensure future changes do not silently add personal context.
  const state = stateSchema.parse(JSON.parse(await readFile(input.statePath, "utf8")));
  assert.match(state.installationId, /^[a-f0-9-]{36}$/);
  assert.equal(state.reported, true);
  assert.equal(requests.length, 2);
  for (const [index, request] of requests.entries()) {
    assert.equal(request.url, "https://eu.i.posthog.com/capture/");
    assert.deepEqual(JSON.parse(await request.text()), {
      api_key: "test-token",
      event: "app.launched",
      properties: {
        distinct_id: state.installationId,
        appVersion: "2.0.2", environment: "production", platform: "darwin", countryCode: "GB",
        isFirstLaunch: index === 0,
        $process_person_profile: false, $geoip_disable: true, $ip: null
      }
    });
  }
});

test("disabled runs and missing tokens perform no I/O", async (t) => {
  const { directory, requests, input } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await trackInstallationLaunch({ ...input, allowed: false });
  await trackInstallationLaunch({ ...input, config: { apiKey: " " } });
  assert.equal(requests.length, 0);
  await assert.rejects(readFile(input.statePath), { code: "ENOENT" });
});

test("failed delivery preserves the identity and retries first-launch reporting on the next run", async (t) => {
  const { directory, requests, input } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(trackInstallationLaunch({ ...input, fetch: async () => new Response(null, { status: 503 }) }), /503/);
  const before = await readFile(input.statePath, "utf8");
  assert.equal(stateSchema.parse(JSON.parse(before)).reported, false);
  await trackInstallationLaunch(input);
  const body = await requests[0].text();
  assert.ok(body.includes(stateSchema.parse(JSON.parse(before)).installationId));
  assert.ok(body.includes('"isFirstLaunch":true'));
});

test("network failures reject without resetting the installation", async (t) => {
  const { directory, input } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(trackInstallationLaunch({ ...input, fetch: async () => { throw new Error("offline"); } }), /offline/);
  assert.equal(stateSchema.parse(JSON.parse(await readFile(input.statePath, "utf8"))).reported, false);
});

test("corrupt installation state is preserved rather than counted as a new install", async (t) => {
  const { directory, requests, input } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(input.statePath, "invalid");
  await assert.rejects(trackInstallationLaunch(input));
  assert.equal(requests.length, 0);
  assert.equal(await readFile(input.statePath, "utf8"), "invalid");
});

test("configuration fails closed and insecure hosts never receive identifiers", async (t) => {
  const { directory, requests, input } = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configPath = path.join(directory, "config.json");
  assert.deepEqual(readAnalyticsConfig(configPath), { apiKey: "" });
  await writeFile(configPath, JSON.stringify(input.config));
  assert.deepEqual(readAnalyticsConfig(configPath), input.config);
  await writeFile(configPath, '{"apiKey":42}');
  assert.deepEqual(readAnalyticsConfig(configPath), { apiKey: "" });
  await assert.rejects(trackInstallationLaunch({ ...input, config: { apiKey: "test", host: "http://example.com" } }), /HTTPS/);
  assert.equal(requests.length, 0);
});
