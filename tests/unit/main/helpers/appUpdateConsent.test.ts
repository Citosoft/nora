import { createAppUpdateConsent } from "@main/helpers/appUpdateConsent";
import type { AutoUpdateStatus, ReleaseVersionStatus } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const available: ReleaseVersionStatus = {
  kind: "available", currentVersion: "0.2.2", latestVersion: "0.2.3", releaseUrl: "https://example.test/release", releaseNotes: "### Features\n\n- New update preview."
};

function fixture(checkRelease = async (): Promise<ReleaseVersionStatus> => available) {
  let status: AutoUpdateStatus = { kind: "idle", currentVersion: "0.2.2", latestVersion: null };
  let downloads = 0;
  let failDownload = false;
  const consent = createAppUpdateConsent({
    getStatus: () => status,
    setStatus: (next) => { status = next; },
    checkRelease,
    startDownload: () => {
      downloads++;
      if (failDownload) throw new Error("Native updater unavailable");
    }
  });
  return {
    consent,
    getStatus: () => status,
    setStatus: (next: AutoUpdateStatus) => { status = next; },
    downloads: () => downloads,
    failDownload: () => { failDownload = true; }
  };
}

test("startup and repeated metadata checks advertise an update without downloading it", async () => {
  const f = fixture();
  await f.consent.check();
  await f.consent.check();
  assert.equal(f.getStatus().kind, "available");
  assert.equal(f.downloads(), 0);
  f.consent.download();
  assert.equal(f.downloads(), 1);
  assert.equal(f.getStatus().kind, "downloading");
  assert.throws(() => f.consent.download(), /No app update/);
  await f.consent.check();
  assert.equal(f.downloads(), 1);
});

test("unavailable updates cannot start native downloads", () => {
  const f = fixture();
  assert.throws(() => f.consent.download(), /No app update/);
  assert.equal(f.downloads(), 0);
});

test("a native startup failure restores the update action for retry", async () => {
  const f = fixture();
  await f.consent.check();
  f.failDownload();
  assert.throws(() => f.consent.download(), /Native updater unavailable/);
  assert.equal(f.getStatus().kind, "available");
});

test("a metadata response arriving after consent cannot replace an active download", async () => {
  let resolveCheck: (value: ReleaseVersionStatus) => void = () => {};
  const f = fixture(() => new Promise((resolve) => { resolveCheck = resolve; }));
  f.setStatus({ kind: "available", currentVersion: "0.2.2", latestVersion: "0.2.3" });
  const pending = f.consent.check();
  f.consent.download();
  resolveCheck(available);
  await pending;
  assert.equal(f.getStatus().kind, "downloading");
  assert.equal(f.downloads(), 1);
});

test("metadata failures preserve an advertised update", async () => {
  const f = fixture(async () => ({ kind: "error", currentVersion: "0.2.2", message: "Offline", releaseUrl: "https://example.test" }));
  f.setStatus({ kind: "available", currentVersion: "0.2.2", latestVersion: "0.2.3" });
  await f.consent.check();
  assert.equal(f.getStatus().kind, "available");
  assert.equal(f.downloads(), 0);
});

test("downloaded and installing updates are preserved without further native or metadata checks", async () => {
  let checks = 0;
  const f = fixture(async () => { checks++; return available; });
  f.setStatus({ kind: "downloaded", currentVersion: "0.2.2", latestVersion: "0.2.3", releaseNotes: null });
  await f.consent.check();
  assert.equal(f.getStatus().kind, "downloaded");
  f.setStatus({ kind: "installing", currentVersion: "0.2.2", latestVersion: "0.2.3" });
  await f.consent.check();
  assert.equal(f.getStatus().kind, "installing");
  assert.equal(checks, 0);
  assert.equal(f.downloads(), 0);
});


test("published notes and release links survive checking and consent", async () => {
  const f = fixture();
  await f.consent.check();
  const advertised = f.getStatus();
  assert.equal(advertised.kind, "available");
  if (advertised.kind !== "available") throw new Error("Expected an available update");
  assert.equal(advertised.releaseNotes, "### Features\n\n- New update preview.");
  assert.equal(advertised.releaseUrl, "https://example.test/release");
  f.consent.download();
  const downloading = f.getStatus();
  if (downloading.kind !== "downloading") throw new Error("Expected an active download");
  assert.equal(downloading.releaseNotes, advertised.releaseNotes);
  assert.equal(downloading.releaseUrl, advertised.releaseUrl);
});
