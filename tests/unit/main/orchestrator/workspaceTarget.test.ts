import { createGetProjectMetadata } from "@main/orchestrator/workspaceTarget";
import type { WorkspaceTarget } from "@main/types/internal.types";
import assert from "node:assert/strict";
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
    getWorkspaceLocation: () => ({ kind: "local" })
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
