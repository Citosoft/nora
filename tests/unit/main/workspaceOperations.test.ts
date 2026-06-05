import { createWorkspaceOperations } from "@main/orchestrator/workspace";
import type { WorkspaceTarget } from "@main/types/internal.types";
import assert from "node:assert/strict";
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

test("listWorkspaceTrackedAndUntrackedFiles uses a large git stdout buffer", async () => {
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

  const files = await operations.listWorkspaceTrackedAndUntrackedFiles(localTarget);

  assert.equal(observedMaxBuffer, 64 * 1024 * 1024);
  assert.deepEqual(files, ["src/a.ts", "src/z.ts"]);
});
