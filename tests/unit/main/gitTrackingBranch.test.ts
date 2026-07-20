import {
  listRemoteTrackingBranches,
  resolveGitTrackingBranch,
  setGitTrackingBranch
} from "@main/helpers/gitTrackingBranch";
import { createWorkspaceGitBindings } from "@main/orchestrator/gitWorkspaceReads";
import type { WorkspaceGitExec, WorkspaceTarget } from "@main/types/internal.types";
import assert from "node:assert/strict";
import test from "node:test";

const target: WorkspaceTarget = { path: "/workspace" };

test("tracking branch resolution uses the configured upstream", async () => {
  const calls: string[][] = [];
  const execGit: WorkspaceGitExec = async (_target, args) => {
    calls.push(args);
    if (args[0] === "rev-parse") {
      return { stdout: "origin/dev\n", stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };

  assert.deepEqual(await resolveGitTrackingBranch(target, execGit, "dev"), {
    configured: true,
    remoteName: "origin",
    remoteBranch: "dev",
    ref: "origin/dev"
  });
  assert.deepEqual(calls[1], ["fetch", "--quiet", "origin", "dev"]);
});

test("tracking branch resolution discovers origin branch without an upstream", async () => {
  const execGit: WorkspaceGitExec = async (_target, args) => {
    if (args[0] === "rev-parse") {
      throw new Error("no upstream configured");
    }
    if (args[0] === "remote") {
      return { stdout: "backup\norigin\n", stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };

  assert.deepEqual(await resolveGitTrackingBranch(target, execGit, "dev"), {
    configured: false,
    remoteName: "origin",
    remoteBranch: "dev",
    ref: "origin/dev"
  });
});

test("remote tracking branches exclude symbolic HEAD refs", async () => {
  const execGit: WorkspaceGitExec = async () => ({
    stdout: "origin/main\t\norigin\trefs/remotes/origin/main\norigin/dev\t\n",
    stderr: ""
  });

  assert.deepEqual(await listRemoteTrackingBranches(target, execGit), ["origin/dev", "origin/main"]);
});

test("setting a tracking branch validates and links an available remote ref", async () => {
  const calls: string[][] = [];
  const execGit: WorkspaceGitExec = async (_target, args) => {
    calls.push(args);
    return args[0] === "for-each-ref"
      ? { stdout: "origin/dev\n", stderr: "" }
      : { stdout: "", stderr: "" };
  };

  await setGitTrackingBranch(target, execGit, "dev", "origin/dev");
  assert.deepEqual(calls.at(-1), ["branch", "--set-upstream-to=origin/dev", "dev"]);
});

test("pull uses the discovered remote branch when no upstream is configured", async () => {
  const calls: string[][] = [];
  const execGit: WorkspaceGitExec = async (_target, args) => {
    calls.push(args);
    if (args.join(" ") === "rev-parse --abbrev-ref HEAD") {
      return { stdout: "dev\n", stderr: "" };
    }
    if (args.includes("@{upstream}")) {
      throw new Error("no upstream configured");
    }
    if (args[0] === "remote") {
      return { stdout: "origin\n", stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };

  await createWorkspaceGitBindings(execGit).pullWorkspaceChanges(target);
  assert.deepEqual(calls.at(-1), ["pull", "--no-rebase", "--no-edit", "origin", "dev"]);
});
