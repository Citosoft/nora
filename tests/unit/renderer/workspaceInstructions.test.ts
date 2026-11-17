import assert from "node:assert/strict";
import test from "node:test";
import { readWorkspaceInstructions } from "@/components/app/logic/workspaceInstructions";
import type { InstructionsReader } from "@/components/app/types/workspaceInstructions.types";

const workspace = { projectId: "project-1", rootPath: "/project/worktree" };

test("reads both root instruction files using the selected checkout", async () => {
  const reader: InstructionsReader = {
    statWorkspacePath: async (request) => {
      assert.equal(request.projectId, workspace.projectId);
      assert.equal(request.rootPath, workspace.rootPath);
      return { exists: true, kind: "file" };
    },
    readWorkspaceFile: async ({ path }) => `# ${path}`
  };
  assert.deepEqual(await readWorkspaceInstructions(reader, workspace), [
    { path: "AGENTS.md", status: "ready", content: "# AGENTS.md" },
    { path: "CLAUDE.md", status: "ready", content: "# CLAUDE.md" }
  ]);
});

test("supports alternate casing, skips missing files and directories, and preserves empty content", async () => {
  const reader: InstructionsReader = {
    statWorkspacePath: async ({ path }) => ({
      exists: path === "AGENTS.md" || path === "AGENTS.MD",
      kind: path === "AGENTS.md" ? "directory" : path === "AGENTS.MD" ? "file" : null
    }),
    readWorkspaceFile: async () => ""
  };
  assert.deepEqual(await readWorkspaceInstructions(reader, workspace), [{ path: "AGENTS.MD", status: "ready", content: "" }]);
});

test("keeps readable instructions when the other file fails", async () => {
  const reader: InstructionsReader = {
    statWorkspacePath: async () => ({ exists: true, kind: "file" }),
    readWorkspaceFile: async ({ path }) => {
      if (path === "AGENTS.md") throw new Error("Permission denied");
      return "Claude instructions";
    }
  };
  assert.deepEqual(await readWorkspaceInstructions(reader, workspace), [
    { path: "AGENTS.md", status: "error", message: "Permission denied" },
    { path: "CLAUDE.md", status: "ready", content: "Claude instructions" }
  ]);
});

test("returns an empty list when neither instruction file exists", async () => {
  const reader: InstructionsReader = {
    statWorkspacePath: async () => ({ exists: false, kind: null }),
    readWorkspaceFile: async () => { throw new Error("Should not read missing files"); }
  };
  assert.deepEqual(await readWorkspaceInstructions(reader, workspace), []);
});
