import {
  buildImportedContextBundlePath,
  ensureNoraImportedContextGitignore,
  importAgentContextBundleIntoWorkspace
} from "@main/orchestrator/agentContextArtifacts";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("ensureNoraImportedContextGitignore appends imported_context/ once", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nora-import-ctx-"));
  await ensureNoraImportedContextGitignore(tmp);
  const gi = await fs.readFile(path.join(tmp, ".nora", ".gitignore"), "utf8");
  assert.match(gi, /^\s*imported_context\/\s*$/m);
  await ensureNoraImportedContextGitignore(tmp);
  const gi2 = await fs.readFile(path.join(tmp, ".nora", ".gitignore"), "utf8");
  assert.equal((gi2.match(/imported_context\//g) || []).length, 1);
});

test("importAgentContextBundleIntoWorkspace copies file and returns destination path", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nora-import-ctx-"));
  const workspace = path.join(tmp, "ws");
  await fs.mkdir(workspace, { recursive: true });
  const source = path.join(tmp, "source.md");
  await fs.writeFile(source, "# bundle\n", "utf8");
  const dest = await importAgentContextBundleIntoWorkspace(workspace, "abc", source);
  assert.equal(dest, buildImportedContextBundlePath(workspace, "abc"));
  assert.equal(await fs.readFile(dest!, "utf8"), "# bundle\n");
});

test("importAgentContextBundleIntoWorkspace returns null for tilde workspace paths", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nora-import-ctx-"));
  const source = path.join(tmp, "source.md");
  await fs.writeFile(source, "x", "utf8");
  const dest = await importAgentContextBundleIntoWorkspace("~/.nora/fake-checkout", "abc", source);
  assert.equal(dest, null);
});
