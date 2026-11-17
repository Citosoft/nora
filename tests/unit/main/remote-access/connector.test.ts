import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { connectorAsset, CONNECTOR_VERSION } from "@main/remote-access/connector/assets";
import { installConnector } from "@main/remote-access/connector/install";

test("connector assets are pinned by platform and reject unsupported architectures", () => {
  for (const [platform, arch] of [["darwin", "x64"], ["darwin", "arm64"], ["linux", "x64"], ["linux", "arm64"], ["win32", "x64"]] as const) {
    const asset = connectorAsset(platform, arch); assert.match(asset.sha256, /^[a-f0-9]{64}$/);
  }
  assert.match(CONNECTOR_VERSION, /^\d{4}\.\d+\.\d+$/);
  assert.throws(() => connectorAsset("win32", "arm64"), /not available/);
});

test("an unverified connector is never installed or executed", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "nora-connector-")); t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(installConnector({ directory, platform: "linux", arch: "x64", fetch: async () => new Response("tampered binary") }, new AbortController().signal, () => {}), /integrity check/);
  assert.deepEqual(await readdir(path.join(directory, CONNECTOR_VERSION, "linux-x64")), []);
});
