import { createWorkspaceOperations } from "@main/orchestrator/workspace";
import type { WorkspaceTarget } from "@main/types/internal.types";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const localTarget: WorkspaceTarget = {
  path: "/workspace",
  location: { kind: "local" }
};

function createWorkspaceOperationsForTest(overrides: {
  execGit?: (target: WorkspaceTarget, args: string[], maxBuffer?: number) => Promise<{ stdout: string; stderr: string }>;
} = {}) {
  return createWorkspaceOperations({
    getWorkspaceLocation: () => ({ kind: "local" }),
    runRemoteSshCommand: async () => ({ stdout: "", stderr: "" }),
    normalizeWorkspaceRelativePath: (relativePath) => relativePath,
    normalizeRemoteShellPath: (value) => value,
    shellQuote: (value) => `'${value}'`,
    execGit: overrides.execGit ?? (async () => ({ stdout: "", stderr: "" })),
    workspaceInternalDirName: ".nora",
    maxWorkspaceSearchResults: 100
  });
}

test("listWorkspaceFilePaths uses a large git stdout buffer", async () => {
  let observedMaxBuffer: number | undefined;
  const operations = createWorkspaceOperationsForTest({
    execGit: async (_target, args, maxBuffer) => {
      assert.deepEqual(args, ["ls-files", "--cached", "--others", "--exclude-standard", "--full-name"]);
      observedMaxBuffer = maxBuffer;
      return {
        stdout: "src/z.ts\nsrc/a.ts\nsrc/a.ts\n",
        stderr: ""
      };
    }
  });

  const files = await operations.listWorkspaceFilePaths(localTarget, "git");

  assert.equal(observedMaxBuffer, 64 * 1024 * 1024);
  assert.deepEqual(files, ["src/a.ts", "src/z.ts"]);
});

test("listWorkspaceFilePaths walks plain folders without git and skips dependency directories", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nora-plain-folder-"));
  try {
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.mkdir(path.join(root, "node_modules", "pkg"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "b.ts"), "");
    await fs.writeFile(path.join(root, "a.md"), "");
    await fs.writeFile(path.join(root, "node_modules", "pkg", "index.js"), "");
    const operations = createWorkspaceOperationsForTest({
      execGit: async () => {
        throw new Error("git must not run for plain folders");
      }
    });

    const files = await operations.listWorkspaceFilePaths({ path: root, location: { kind: "local" } }, "none");

    assert.deepEqual(files, ["a.md", "src/b.ts"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("searchWorkspaceFiles uses git grep --no-index for plain folders", async () => {
  let observedArgs: string[] = [];
  const operations = createWorkspaceOperationsForTest({
    execGit: async (_target, args) => {
      observedArgs = args;
      return { stdout: "notes/todo.md:3:hello world\n", stderr: "" };
    }
  });

  const results = await operations.searchWorkspaceFiles(localTarget, "hello", false, "none");

  assert.equal(observedArgs[1], "--no-index");
  assert.ok(!observedArgs.includes("--untracked"));
  assert.ok(observedArgs.includes(":(exclude,glob)**/node_modules/**"));
  assert.deepEqual(results, [{ path: "notes/todo.md", lineNumber: 3, lineText: "hello world", matchCount: 1 }]);
});
