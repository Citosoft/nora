import { createProviderUpdateChecker } from "@main/provider-updates/checkProviderUpdates";
import { createNpmLatestVersionReader } from "@main/provider-updates/npmRegistry";
import type { AgentDetectionInfo } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function detection(id: string, detectedPath: string | null): AgentDetectionInfo {
  return { id, detected: detectedPath !== null, detectedCommand: id, detectedPath, detectionProbe: null, detectionStdout: null, detectionStderr: null };
}

const definitions = [
  { id: "claude", label: "Claude Code", npmPackage: "@anthropic-ai/claude-code" },
  { id: "codex", label: "Codex", npmPackage: "@openai/codex" },
  { id: "cursor", label: "Cursor Agent", npmPackage: null }
];

test("reports only detected providers whose installed version is behind the latest release", async () => {
  const installed: Record<string, string | null> = { "/bin/claude": "2.0.1", "/bin/codex": "0.45.0", "/bin/cursor": "1.0.0" };
  const latest: Record<string, string> = { "@anthropic-ai/claude-code": "2.1.0", "@openai/codex": "0.45.0" };
  const check = createProviderUpdateChecker({
    definitions,
    readInstalledVersion: async (path) => installed[path] ?? null,
    fetchLatestVersion: async (pkg) => latest[pkg] ?? null
  });

  const notices = await check([detection("claude", "/bin/claude"), detection("codex", "/bin/codex"), detection("cursor", "/bin/cursor")]);

  assert.deepEqual(notices, [{ toolId: "claude", label: "Claude Code", installedVersion: "2.0.1", latestVersion: "2.1.0" }]);
});

test("skips undetected providers and unresolvable versions without querying the registry needlessly", async () => {
  const fetched: string[] = [];
  const check = createProviderUpdateChecker({
    definitions,
    readInstalledVersion: async () => null,
    fetchLatestVersion: async (pkg) => {
      fetched.push(pkg);
      return "9.9.9";
    }
  });

  assert.deepEqual(await check([detection("claude", null), detection("codex", "/bin/codex")]), []);
  assert.deepEqual(fetched, ["@openai/codex"]);
});

test("npm reader requests the encoded latest manifest and tolerates failures", async () => {
  const urls: string[] = [];
  const read = createNpmLatestVersionReader(async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ version: "2.1.0" }) };
  });
  assert.equal(await read("@anthropic-ai/claude-code"), "2.1.0");
  assert.deepEqual(urls, ["https://registry.npmjs.org/@anthropic-ai%2Fclaude-code/latest"]);

  assert.equal(await createNpmLatestVersionReader(async () => ({ ok: false, json: async () => ({}) }))("x"), null);
  assert.equal(await createNpmLatestVersionReader(async () => ({ ok: true, json: async () => ({ nope: 1 }) }))("x"), null);
  assert.equal(await createNpmLatestVersionReader(async () => { throw new Error("offline"); })("x"), null);
});
