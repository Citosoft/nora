import { resolveWorkspaceProjectIconMode, shouldInvertFrameworkLogoInDarkMode } from "@/components/app/logic/workspaceProjectIcon";
import assert from "node:assert/strict";
import test from "node:test";

test("resolveWorkspaceProjectIconMode prefers project favicon when available", () => {
  assert.equal(
    resolveWorkspaceProjectIconMode({
      projectFaviconUrl: "https://example.com/favicon.ico",
      projectFaviconFailed: false,
      frameworkLogoUrl: "https://example.com/framework.svg",
      frameworkLogoFailed: false
    }),
    "project-favicon"
  );
});

test("resolveWorkspaceProjectIconMode falls back to framework logo when project favicon fails", () => {
  assert.equal(
    resolveWorkspaceProjectIconMode({
      projectFaviconUrl: "https://example.com/favicon.ico",
      projectFaviconFailed: true,
      frameworkLogoUrl: "https://example.com/framework.svg",
      frameworkLogoFailed: false
    }),
    "framework-logo"
  );
});

test("resolveWorkspaceProjectIconMode returns fallback when all image sources are unavailable", () => {
  assert.equal(
    resolveWorkspaceProjectIconMode({
      projectFaviconUrl: " ",
      projectFaviconFailed: false,
      frameworkLogoUrl: "",
      frameworkLogoFailed: false
    }),
    "fallback"
  );
});

test("shouldInvertFrameworkLogoInDarkMode targets Next.js only", () => {
  assert.equal(shouldInvertFrameworkLogoInDarkMode("nextjs"), true);
  assert.equal(shouldInvertFrameworkLogoInDarkMode("next"), true);
  assert.equal(shouldInvertFrameworkLogoInDarkMode("react"), false);
  assert.equal(shouldInvertFrameworkLogoInDarkMode(null), false);
});
