import {
  isWorkspaceImageLinkTarget,
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

test("isWorkspaceImageLinkTarget recognizes image paths", () => {
  assert.equal(isWorkspaceImageLinkTarget("assets/diagram.png"), true);
  assert.equal(isWorkspaceImageLinkTarget("docs/guide.md"), false);
});
