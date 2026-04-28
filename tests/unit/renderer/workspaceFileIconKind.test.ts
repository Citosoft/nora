import { getWorkspaceFileIconKind } from "@/lib/workspaceFileIconKind";
import assert from "node:assert/strict";
import test from "node:test";

test("getWorkspaceFileIconKind uses basename rules", () => {
  assert.equal(getWorkspaceFileIconKind("Dockerfile"), "config");
  assert.equal(getWorkspaceFileIconKind("path/to/Makefile"), "terminal");
  assert.equal(getWorkspaceFileIconKind("cmakelists.txt"), "code");
});

test("getWorkspaceFileIconKind treats env files as config", () => {
  assert.equal(getWorkspaceFileIconKind(".env"), "config");
  assert.equal(getWorkspaceFileIconKind("apps/web/.env.local"), "config");
});

test("getWorkspaceFileIconKind maps common extensions", () => {
  assert.equal(getWorkspaceFileIconKind("src/App.tsx"), "code");
  assert.equal(getWorkspaceFileIconKind("data/blob.png"), "image");
  assert.equal(getWorkspaceFileIconKind("package.json"), "json");
  assert.equal(getWorkspaceFileIconKind("README.md"), "markdown");
  assert.equal(getWorkspaceFileIconKind("yarn.lock"), "config");
  assert.equal(getWorkspaceFileIconKind("schema.sql"), "database");
  assert.equal(getWorkspaceFileIconKind("notes.txt"), "text");
  assert.equal(getWorkspaceFileIconKind("backup.tar.gz"), "archive");
});

test("getWorkspaceFileIconKind returns generic when unknown", () => {
  assert.equal(getWorkspaceFileIconKind("weird/no-extension"), "generic");
  assert.equal(getWorkspaceFileIconKind(""), "generic");
});
