import { getWorkspaceCodeSimpleIcon } from "@/lib/workspaceCodeSimpleIcon";
import assert from "node:assert/strict";
import test from "node:test";

test("getWorkspaceCodeSimpleIcon resolves common languages", () => {
  assert.notEqual(getWorkspaceCodeSimpleIcon("src/App.tsx"), null);
  assert.notEqual(getWorkspaceCodeSimpleIcon("lib/util.ts"), null);
  assert.notEqual(getWorkspaceCodeSimpleIcon("script.py"), null);
  assert.notEqual(getWorkspaceCodeSimpleIcon("main.go"), null);
  assert.notEqual(getWorkspaceCodeSimpleIcon("Gemfile"), null);
});

test("getWorkspaceCodeSimpleIcon returns null for unmapped code-like paths", () => {
  assert.equal(getWorkspaceCodeSimpleIcon("opaque.xyz"), null);
});
