import { createGetProjectMetadata, localProjectFolderExists } from "@main/orchestrator/workspaceTarget";
import type { WorkspaceTarget } from "@main/types/internal.types";
import { isMissingProjectFolderError } from "@shared/projectFolderErrors";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const target: WorkspaceTarget = {
  path: "/tmp/new-project",
  location: { kind: "local" }
};

test("createGetProjectMetadata reads symbolic branch for git repositories without commits", async () => {
  const calls: string[] = [];
  const getProjectMetadata = createGetProjectMetadata({
    execGit: async (_target, args) => {
      calls.push(args.join(" "));
      if (args.join(" ") === "rev-parse --show-toplevel") {
        return { stdout: "/tmp/new-project\n", stderr: "" };
      }
      if (args.join(" ") === "rev-parse --abbrev-ref HEAD") {
        throw new Error("Command failed: /usr/bin/git rev-parse --abbrev-ref HEAD fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.");
      }
      if (args.join(" ") === "symbolic-ref --short HEAD") {
        return { stdout: "main\n", stderr: "" };
      }
      if (args.join(" ") === "rev-parse --git-common-dir") {
        return { stdout: ".git\n", stderr: "" };
      }
      throw new Error(`Unexpected git command: ${args.join(" ")}`);
    },
    getGitProgressCommand: async (_target, args) => `git ${args.join(" ")}`,
    nowIso: () => "2026-06-05T00:00:00.000Z",
    detectWorkspaceFramework: async () => null,
    detectWorkspaceInstructionFile: async () => null,
    computeWorkspaceProjectId: () => "new-project-1",
    getWorkspaceLocation: () => ({ kind: "local" }),
    projectFolderExists: async () => true
  });

  const project = await getProjectMetadata(target);

  assert.equal(project.baseBranch, "main");
  assert.deepEqual(calls, [
    "rev-parse --show-toplevel",
    "rev-parse --abbrev-ref HEAD",
    "symbolic-ref --short HEAD",
    "rev-parse --git-common-dir"
  ]);
});

test("createGetProjectMetadata opens non-git folders as plain projects", async () => {
  const calls: string[] = [];
  const getProjectMetadata = createGetProjectMetadata({
    execGit: async (_target, args) => {
      calls.push(args.join(" "));
      throw new Error("Command failed: git rev-parse --show-toplevel\nfatal: not a git repository (or any of the parent directories): .git");
    },
    getGitProgressCommand: async (_target, args) => `git ${args.join(" ")}`,
    nowIso: () => "2026-06-05T00:00:00.000Z",
    detectWorkspaceFramework: async () => null,
    detectWorkspaceInstructionFile: async () => null,
    computeWorkspaceProjectId: () => "new-project-1",
    getWorkspaceLocation: () => ({ kind: "local" }),
    projectFolderExists: async () => true
  });

  const project = await getProjectMetadata(target);

  assert.equal(project.versionControl, "none");
  assert.equal(project.rootPath, path.resolve(target.path));
  assert.equal(project.gitCommonDir, "");
  assert.equal(project.baseBranch, "");
  assert.deepEqual(calls, ["rev-parse --show-toplevel"]);
});

test("createGetProjectMetadata rethrows git failures other than a missing repository", async () => {
  const getProjectMetadata = createGetProjectMetadata({
    execGit: async () => {
      throw new Error("Git could not be found.");
    },
    getGitProgressCommand: async (_target, args) => `git ${args.join(" ")}`,
    nowIso: () => "2026-06-05T00:00:00.000Z",
    detectWorkspaceFramework: async () => null,
    detectWorkspaceInstructionFile: async () => null,
    computeWorkspaceProjectId: () => "new-project-1",
    getWorkspaceLocation: () => ({ kind: "local" }),
    projectFolderExists: async () => true
  });

  await assert.rejects(getProjectMetadata(target), /Git could not be found/);
});

test("createGetProjectMetadata reports a deleted project folder instead of running git", async () => {
  const calls: string[] = [];
  const getProjectMetadata = createGetProjectMetadata({
    execGit: async (_target, args) => {
      calls.push(args.join(" "));
      return { stdout: "", stderr: "" };
    },
    getGitProgressCommand: async (_target, args) => `git ${args.join(" ")}`,
    nowIso: () => "2026-06-05T00:00:00.000Z",
    detectWorkspaceFramework: async () => null,
    detectWorkspaceInstructionFile: async () => null,
    computeWorkspaceProjectId: () => "new-project-1",
    getWorkspaceLocation: () => ({ kind: "local" }),
    projectFolderExists: async () => false
  });

  await assert.rejects(getProjectMetadata(target), (error: unknown) => isMissingProjectFolderError(error));
  assert.deepEqual(calls, []);
});

test("localProjectFolderExists distinguishes existing and deleted local folders", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-project-folder-"));
  try {
    assert.equal(await localProjectFolderExists({ path: root, location: { kind: "local" } }), true);
    assert.equal(await localProjectFolderExists({ path: path.join(root, "deleted"), location: { kind: "local" } }), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
