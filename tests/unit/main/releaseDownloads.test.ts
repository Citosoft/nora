import {
  getReleaseInstallerScriptCommandForLocalTerminal,
  readReleaseAssetResponseBytes
} from "@main/releaseDownloads";
import assert from "node:assert/strict";
import test from "node:test";

test("readReleaseAssetResponseBytes emits chunked progress while streaming", async () => {
  const encoder = new TextEncoder();
  const progress: Array<{ downloadedBytes: number; totalBytes: number | null; percent: number | null }> = [];
  const response = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("abc"));
      controller.enqueue(encoder.encode("defg"));
      controller.close();
    }
  }), {
    headers: {
      "content-length": "7"
    }
  });

  const result = await readReleaseAssetResponseBytes(response, "nora.dmg", (payload) => {
    progress.push({
      downloadedBytes: payload.downloadedBytes,
      totalBytes: payload.totalBytes,
      percent: payload.percent
    });
  });

  assert.equal(new TextDecoder().decode(result.bytes), "abcdefg");
  assert.equal(result.totalBytes, 7);
  assert.equal(result.emittedProgress, true);
  assert.deepEqual(progress, [
    { downloadedBytes: 3, totalBytes: 7, percent: 43 },
    { downloadedBytes: 7, totalBytes: 7, percent: 100 }
  ]);
});

test("readReleaseAssetResponseBytes keeps percent unknown when the server omits total size", async () => {
  const encoder = new TextEncoder();
  const progress: Array<{ downloadedBytes: number; totalBytes: number | null; percent: number | null }> = [];
  const response = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("ab"));
      controller.enqueue(encoder.encode("cd"));
      controller.close();
    }
  }));

  const result = await readReleaseAssetResponseBytes(response, "nora.dmg", (payload) => {
    progress.push({
      downloadedBytes: payload.downloadedBytes,
      totalBytes: payload.totalBytes,
      percent: payload.percent
    });
  });

  assert.equal(new TextDecoder().decode(result.bytes), "abcd");
  assert.equal(result.totalBytes, null);
  assert.equal(result.emittedProgress, true);
  assert.deepEqual(progress, [
    { downloadedBytes: 2, totalBytes: null, percent: null },
    { downloadedBytes: 4, totalBytes: null, percent: null }
  ]);
});

test("getReleaseInstallerScriptCommandForLocalTerminal returns the hosted Linux install command", () => {
  assert.equal(
    getReleaseInstallerScriptCommandForLocalTerminal("linux"),
    "curl -fsSL https://withnora.run/install.sh | bash"
  );
});

test("getReleaseInstallerScriptCommandForLocalTerminal returns the hosted macOS install command", () => {
  assert.equal(
    getReleaseInstallerScriptCommandForLocalTerminal("darwin"),
    "curl -fsSL https://withnora.run/install-macos.sh | bash"
  );
});

test("getReleaseInstallerScriptCommandForLocalTerminal returns the hosted Windows install command", () => {
  assert.equal(
    getReleaseInstallerScriptCommandForLocalTerminal("win32"),
    "irm https://withnora.run/install.ps1 | iex"
  );
});

test("getReleaseInstallerScriptCommandForLocalTerminal returns null for unsupported platforms", () => {
  assert.equal(getReleaseInstallerScriptCommandForLocalTerminal("freebsd"), null);
});
