import assert from "node:assert/strict";
import test from "node:test";
import { pickWorkspaceLogoPaths } from "@main/helpers/workspaceLogo";

test("prefers an explicit logo over app icons and favicons", () => {
  assert.deepEqual(pickWorkspaceLogoPaths(["public/favicon.ico", "build/icon.png", "assets/logo.svg", "README.md"]),
    ["assets/logo.svg", "build/icon.png", "public/favicon.ico"]);
});

test("prefers shallow paths, then vector formats, and avoids wordmark or dark variants", () => {
  assert.deepEqual(pickWorkspaceLogoPaths(["docs/images/logo.png", "logo.png", "logo.svg", "logo-wordmark.svg", "logo-dark.svg"], 5),
    ["logo.svg", "logo.png", "docs/images/logo.png", "logo-dark.svg", "logo-wordmark.svg"]);
});

test("ignores vendored, generated and sample artwork, non-images and unrelated names", () => {
  assert.deepEqual(pickWorkspaceLogoPaths([
    "node_modules/pkg/logo.svg", "dist/favicon.ico", "examples/app/logo.png", "tests/fixtures/icon.png",
    "logo.txt", "assets/hero.png", "a/b/c/d/e/logo.svg", "catalog.svg", "iconography.png"
  ]), []);
});

test("matches common icon naming such as sized app icons and project-prefixed logos", () => {
  assert.deepEqual(pickWorkspaceLogoPaths(["src-tauri/icons/icon_512x512.png", "static/nora-logo.svg"]),
    ["static/nora-logo.svg", "src-tauri/icons/icon_512x512.png"]);
  assert.deepEqual(pickWorkspaceLogoPaths(["Public\\Favicon.SVG"]), ["Public/Favicon.SVG"]);
});
