import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { discoverWorkspaces } from "@main/workspace-import/discovery";

test("discovery merges providers, nested folders and aliases while excluding existing, missing and relative paths", async () => {
  const temp = await realpath(await mkdtemp(path.join(os.tmpdir(), "nora-import-")));
  try {
    const project = path.join(temp, "project");
    const existing = path.join(temp, "existing");
    const plain = path.join(temp, "plain");
    const worktree = path.join(temp, "worktree");
    await Promise.all([mkdir(path.join(project, ".git"), { recursive: true }), mkdir(path.join(project, "src"), { recursive: true }),
      mkdir(existing), mkdir(plain), mkdir(worktree)]);
    await writeFile(path.join(worktree, ".git"), "gitdir: /some/repository/.git/worktrees/check");
    const alias = path.join(temp, "alias");
    await symlink(project, alias, "dir");
    const result = await discoverWorkspaces([
      { id: "claude", listPaths: async () => [project, path.join(project, "src"), alias, existing, plain, worktree, "relative", path.join(temp, "deleted")] },
      { id: "codex", listPaths: async () => [alias, project] }
    ], [existing]);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(result.workspaces, [
      { path: plain, name: "plain", sources: ["claude"] },
      { path: project, name: "project", sources: ["claude", "codex"] },
      { path: worktree, name: "worktree", sources: ["claude"] }
    ]);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("a failed provider reports a warning without hiding projects from another provider", async () => {
  const temp = await realpath(await mkdtemp(path.join(os.tmpdir(), "nora-import-")));
  try {
    const result = await discoverWorkspaces([
      { id: "claude", listPaths: async () => { throw new Error("permission denied"); } },
      { id: "codex", listPaths: async () => [temp] }
    ], []);
    assert.equal(result.workspaces.length, 1);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /Claude/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
