import assert from "node:assert/strict";
import test from "node:test";
import {
  describeRepositoryStar,
  formatReleaseAssetSize,
  summarizeAboutUpdateStatus
} from "@/components/app/logic/aboutDialogStatus";

test("about update summary stays pending until the first check completes", () => {
  const summary = summarizeAboutUpdateStatus(
    { kind: "up-to-date", currentVersion: "2.0.0", latestVersion: "2.0.0", releaseUrl: "" },
    false,
    "1.9.0"
  );

  assert.equal(summary.tone, "pending");
  assert.equal(summary.installedVersion, "2.0.0");
  assert.equal(summary.canUpdate, false);
});

test("about update summary only offers updates when a release URL exists", () => {
  const withUrl = summarizeAboutUpdateStatus(
    { kind: "available", currentVersion: "2.0.0", latestVersion: "2.1.0", releaseUrl: "https://example.test/r" },
    true,
    "2.0.0"
  );
  const withoutUrl = summarizeAboutUpdateStatus(
    { kind: "available", currentVersion: "2.0.0", latestVersion: "2.1.0", releaseUrl: "  " },
    true,
    "2.0.0"
  );

  assert.deepEqual(
    { tone: withUrl.tone, latestVersion: withUrl.latestVersion, canUpdate: withUrl.canUpdate },
    { tone: "available", latestVersion: "2.1.0", canUpdate: true }
  );
  assert.equal(withoutUrl.canUpdate, false);
});

test("about update summary surfaces check errors as detail and falls back to the bundled version", () => {
  const summary = summarizeAboutUpdateStatus(
    { kind: "error", currentVersion: "", message: "offline", releaseUrl: "" },
    true,
    "2.0.0"
  );

  assert.equal(summary.tone, "error");
  assert.equal(summary.detail, "offline");
  assert.equal(summary.installedVersion, "2.0.0");
});

test("repository star description handles missing gh, unknown and compact counts", () => {
  assert.match(describeRepositoryStar("unavailable", 10, "Nora"), /GitHub CLI/);
  assert.equal(describeRepositoryStar("loading", null, "Nora"), "Show your support for the project");
  assert.equal(describeRepositoryStar("unstarred", 1, "Nora"), "1 star");
  assert.equal(describeRepositoryStar("starred", 1520, "Nora"), "1.5K stars");
});

test("release asset size rounds to whole megabytes with a floor of 1 MB", () => {
  assert.equal(formatReleaseAssetSize(0), "Unknown size");
  assert.equal(formatReleaseAssetSize(1024), "1 MB");
  assert.equal(formatReleaseAssetSize(150 * 1024 * 1024), "150 MB");
});
