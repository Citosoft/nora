import assert from "node:assert/strict";
import test from "node:test";
import { parseNumstatTotals, readGitBranchChanges, readGitBranchDiff, resolveGitBaseBranch, splitPatchByFile } from "@main/orchestrator/gitBranchChanges";
import { parseWorktreePaths, resolveProjectCheckoutTarget } from "@main/orchestrator/workspacePathResolution";
import type { WorkspaceGitExec, WorkspaceTarget } from "@main/types/internal.types";
import type { ProjectSummary } from "@shared/appTypes";

const target: WorkspaceTarget = { path: "/repo-worktree", location: { kind: "local" } };

/** Fails like `execFile` when a command is not scripted, so unexpected git calls surface as missing data. */
function scriptedGit(responses: Record<string, string | { exitCode: 1; stdout: string }>): { execGit: WorkspaceGitExec; calls: string[] } {
  const calls: string[] = [];
  const execGit: WorkspaceGitExec = async (_target, args) => {
    const command = args.join(" ");
    calls.push(command);
    const response = responses[command];
    if (response === undefined) throw Object.assign(new Error(`fatal: ${command}`), { code: 128, stdout: "" });
    if (typeof response === "string") return { stdout: response, stderr: "" };
    throw Object.assign(new Error("differences"), { code: response.exitCode, stdout: response.stdout });
  };
  return { execGit, calls };
}

test("parseNumstatTotals sums text lines and counts binary files without lines", () => {
  assert.deepEqual(parseNumstatTotals("3\t1\tsrc/a.ts\n10\t0\tsrc/b.ts\n-\t-\timage.png\n\n"), { files: 3, additions: 13, deletions: 1 });
  assert.deepEqual(parseNumstatTotals(""), { files: 0, additions: 0, deletions: 0 });
});

test("resolveGitBaseBranch prefers the remote HEAD and falls back to conventional branches", async () => {
  const remote = scriptedGit({ "symbolic-ref --quiet --short refs/remotes/origin/HEAD": "origin/trunk\n" });
  assert.deepEqual(await resolveGitBaseBranch(target, remote.execGit), { branch: "trunk", ref: "origin/trunk" });

  const local = scriptedGit({ "rev-parse --verify --quiet master^{commit}": "abc\n" });
  assert.deepEqual(await resolveGitBaseBranch(target, local.execGit), { branch: "master", ref: "master" });

  assert.equal(await resolveGitBaseBranch(target, scriptedGit({}).execGit), null);
});

test("readGitBranchChanges measures committed, uncommitted and untracked work from the merge base", async () => {
  const { execGit } = scriptedGit({
    "symbolic-ref --quiet --short HEAD": "feature/panel\n",
    "symbolic-ref --quiet --short refs/remotes/origin/HEAD": "origin/main\n",
    "merge-base HEAD origin/main": "base123\n",
    "diff --numstat --no-renames base123 --": "5\t2\tsrc/a.ts\n1\t1\tsrc/b.ts\n",
    "ls-files --others --exclude-standard -z": "notes.md\0",
    "status --porcelain=v1 -z --no-renames --untracked-files=all": " M src/b.ts\0?? notes.md\0",
    "rev-list --count origin/main..HEAD": "2\n",
    "for-each-ref --format=%(refname:short) refs/heads": "feature/panel\n",
    "diff --no-index --no-color --numstat -- /dev/null notes.md": { exitCode: 1, stdout: "4\t0\t/dev/null => notes.md\n" }
  });
  assert.deepEqual(await readGitBranchChanges(target, execGit), {
    branch: "feature/panel", baseBranch: "main", files: 3, additions: 10, deletions: 3, partial: false,
    commitsAhead: 2, uncommittedFiles: 2, branches: ["feature/panel", "main"]
  });
});

test("readGitBranchChanges is unavailable on a detached HEAD", async () => {
  assert.equal(await readGitBranchChanges(target, scriptedGit({}).execGit), null);
});

const project: ProjectSummary = { id: "project", name: "Repo", rootPath: "/repo", location: { kind: "local" }, versionControl: "git", gitCommonDir: "/repo/.git",
  baseBranch: "main", framework: null, platform: "darwin", createdAt: "", updatedAt: "", lastOpenedAt: "" };

test("resolveProjectCheckoutTarget accepts only the project root and its Git worktrees", async () => {
  const listing = "worktree /repo\nHEAD abc\nbranch refs/heads/main\n\nworktree /repo-worktree\nHEAD def\nbranch refs/heads/feature\n";
  assert.deepEqual(parseWorktreePaths(listing), ["/repo", "/repo-worktree"]);
  const { execGit } = scriptedGit({ "worktree list --porcelain": listing });
  assert.deepEqual(await resolveProjectCheckoutTarget(project, "/repo", execGit), { path: "/repo", location: { kind: "local" } });
  assert.deepEqual(await resolveProjectCheckoutTarget(project, "/repo-worktree", execGit), { path: "/repo-worktree", location: { kind: "local" } });
  await assert.rejects(resolveProjectCheckoutTarget(project, "/elsewhere", execGit), /not part of the selected repository/);
});

test("splitPatchByFile keeps one chunk per file, including binary and mode-only changes", () => {
  const patch = "diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-a\n+b\ndiff --git a/img.png b/img.png\nBinary files a/img.png and b/img.png differ\n";
  assert.deepEqual(splitPatchByFile(patch).map((chunk) => chunk.split("\n")[0]), ["diff --git a/a.ts b/a.ts", "diff --git a/img.png b/img.png"]);
  assert.deepEqual(splitPatchByFile(""), []);
});

test("readGitBranchDiff pairs files with their patches by position and appends untracked files as added", async () => {
  const patch = "diff --git a/docs/a b.md b/docs/a b.md\ndeleted file mode 100644\n--- a/docs/a b.md\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-one\n-two\n"
    + "diff --git a/src/x.ts b/src/x.ts\n--- a/src/x.ts\n+++ b/src/x.ts\n@@ -1 +1,2 @@\n-old\n+new\n+more\n";
  const { execGit } = scriptedGit({
    "symbolic-ref --quiet --short HEAD": "feature\n",
    "symbolic-ref --quiet --short refs/remotes/origin/HEAD": "origin/main\n",
    "merge-base HEAD origin/main": "base123\n",
    "diff --name-status -z --no-renames base123 --": "D\0docs/a b.md\0M\0src/x.ts\0",
    "diff --no-color --no-ext-diff --no-renames base123 --": patch,
    "ls-files --others --exclude-standard -z": "new.md\0",
    "diff --no-index --no-color -- /dev/null new.md": { exitCode: 1, stdout: "diff --git a/new.md b/new.md\n+++ b/new.md\n@@ -0,0 +1 @@\n+hello\n" }
  });
  const changes = await readGitBranchDiff(target, execGit);
  assert.deepEqual(changes?.map(({ path, status, additions, deletions }) => ({ path, status, additions, deletions })), [
    { path: "docs/a b.md", status: "deleted", additions: 0, deletions: 2 },
    { path: "new.md", status: "added", additions: 1, deletions: 0 },
    { path: "src/x.ts", status: "modified", additions: 2, deletions: 1 }
  ]);
  assert.ok(changes?.[2].diff.includes("+more"));
});
