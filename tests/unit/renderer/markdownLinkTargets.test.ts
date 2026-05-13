import {
  buildWorkspaceMarkdownLink,
  isWorkspaceImageLinkTarget,
  resolveWorkspaceMarkdownLinkHref,
  resolveWorkspaceMarkdownLinkTarget
} from "@/components/app/logic/markdownLinkTargets";
import assert from "node:assert/strict";
import test from "node:test";

test("resolveWorkspaceMarkdownLinkTarget resolves relative links against the current file", () => {
  assert.equal(
    resolveWorkspaceMarkdownLinkTarget("docs/guide/intro.md", "../api/reference.md"),
    "docs/api/reference.md"
  );
});

test("resolveWorkspaceMarkdownLinkTarget resolves root-relative links inside the workspace", () => {
  assert.equal(
    resolveWorkspaceMarkdownLinkTarget("docs/guide/intro.md", "/README.md"),
    "README.md"
  );
});

test("resolveWorkspaceMarkdownLinkTarget rejects links that escape the workspace root", () => {
  assert.equal(resolveWorkspaceMarkdownLinkTarget("docs/guide/intro.md", "../../../secret.txt"), null);
});

test("resolveWorkspaceMarkdownLinkTarget ignores browser-style links and hash links", () => {
  assert.equal(resolveWorkspaceMarkdownLinkTarget("docs/guide/intro.md", "https://example.com"), null);
  assert.equal(resolveWorkspaceMarkdownLinkTarget("docs/guide/intro.md", "#section"), null);
});

test("resolveWorkspaceMarkdownLinkHref computes a relative href from a note to a dropped workspace file", () => {
  assert.equal(
    resolveWorkspaceMarkdownLinkHref(".nora/notes/plan.md", "renderer/components/app/panels/FileEditorPanel.tsx"),
    "../../renderer/components/app/panels/FileEditorPanel.tsx"
  );
});

test("buildWorkspaceMarkdownLink formats the dropped file as a markdown link", () => {
  assert.equal(
    buildWorkspaceMarkdownLink(".nora/specs/launch.md", "docs/release plan.md"),
    "[release plan.md](<../../docs/release plan.md>)"
  );
});

test("isWorkspaceImageLinkTarget recognizes image paths", () => {
  assert.equal(isWorkspaceImageLinkTarget("assets/diagram.png"), true);
  assert.equal(isWorkspaceImageLinkTarget("docs/guide.md"), false);
});
