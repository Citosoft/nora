import { buildMacAppBundleSearchPaths, getMacAppBundleBaseName, resolveIdeIconSourcePath, resolveMacAppBundlePath } from "@main/ideIconPath";
import assert from "node:assert/strict";
import test from "node:test";

test("resolveMacAppBundlePath extracts .app bundle from macOS executable path", () => {
  assert.equal(
    resolveMacAppBundlePath("/Applications/Cursor.app/Contents/MacOS/Cursor"),
    "/Applications/Cursor.app"
  );
});

test("resolveMacAppBundlePath extracts .app bundle from nested resource path", () => {
  assert.equal(
    resolveMacAppBundlePath("/Applications/Cursor.app/Contents/Resources/app/bin/cursor"),
    "/Applications/Cursor.app"
  );
});

test("resolveMacAppBundlePath returns null for non-app executable paths", () => {
  assert.equal(resolveMacAppBundlePath("/usr/local/bin/cursor"), null);
});

test("resolveIdeIconSourcePath keeps non-darwin paths unchanged", () => {
  const linuxPath = "/usr/local/bin/cursor";
  assert.equal(resolveIdeIconSourcePath(linuxPath, "linux"), linuxPath);
});

test("resolveIdeIconSourcePath uses app bundle on darwin", () => {
  assert.equal(
    resolveIdeIconSourcePath("/Applications/Cursor.app/Contents/MacOS/Cursor", "darwin"),
    "/Applications/Cursor.app"
  );
});

test("getMacAppBundleBaseName returns bundle basename", () => {
  assert.equal(
    getMacAppBundleBaseName("/Applications/Cursor.app/Contents/MacOS/Cursor"),
    "Cursor.app"
  );
});

test("buildMacAppBundleSearchPaths builds system and user app paths", () => {
  assert.deepEqual(
    buildMacAppBundleSearchPaths(["Cursor", "Cursor.app"], "/Users/devuser"),
    ["/Applications/Cursor.app", "/Users/devuser/Applications/Cursor.app"]
  );
});
