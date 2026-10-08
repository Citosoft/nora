import { resolveWorkspaceFileViewKind } from "@shared/workspaceFileViewKind";
import assert from "node:assert/strict";
import test from "node:test";

test("resolveWorkspaceFileViewKind previews images inline", () => {
  assert.equal(resolveWorkspaceFileViewKind("assets/logo.PNG"), "image");
  assert.equal(resolveWorkspaceFileViewKind("icons/mark.svg"), "image");
});

test("resolveWorkspaceFileViewKind hands PDFs and office documents to the OS", () => {
  assert.equal(resolveWorkspaceFileViewKind("docs/spec.pdf"), "external");
  assert.equal(resolveWorkspaceFileViewKind("docs\\Report.DOCX"), "external");
});

test("resolveWorkspaceFileViewKind opens everything else as text", () => {
  assert.equal(resolveWorkspaceFileViewKind("src/index.ts"), "text");
  assert.equal(resolveWorkspaceFileViewKind("Makefile"), "text");
  assert.equal(resolveWorkspaceFileViewKind(".pdf"), "text");
  assert.equal(resolveWorkspaceFileViewKind("pdf.d/readme"), "text");
});
