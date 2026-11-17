import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { createGitReviewer, parseChangedPaths } from "@main/execution/reviewGit";
import { LocalWorkspaceAuthority } from "@main/execution/localWorkspace";
import { createCheckoutInspector } from "@main/execution/workspaceGit";

const execFileAsync = promisify(execFile);

test("status parsing preserves spaces/newlines and rename sources; truncated output cannot become clean evidence", () => {
  assert.deepEqual(parseChangedPaths(" M existing.md\0R  new name.md\0old name.md\0?? notes\nline.md\0"),
    ["existing.md", "new name.md", "notes\nline.md", "old name.md"]);
  assert.deepEqual(parseChangedPaths(""), []);
  assert.throws(() => parseChangedPaths(" M truncated"), /Truncated/);
  assert.throws(() => parseChangedPaths("R  target\0"), /rename source/);
  assert.throws(() => parseChangedPaths("malformed\0"), /Invalid/);
});

test("Git review includes staged, unstaged, renamed, deleted and untracked files without modifying the index", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-review-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "repo");
  const git = (...args: string[]) => execFileAsync("git", ["-C", root, ...args]);
  await execFileAsync("git", ["init", "-b", "main", root]);
  for (const name of ["staged.md", "unstaged.md", "old.md", "deleted.md"]) await writeFile(join(root, name), name);
  await git("add", ".");
  await git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "-c", "commit.gpgSign=false",
    "-c", `core.hooksPath=${join(directory, "unused-hooks")}`, "commit", "-m", "Fixture");
  await writeFile(join(root, "staged.md"), "staged"); await git("add", "staged.md");
  await writeFile(join(root, "unstaged.md"), "unstaged"); await rename(join(root, "old.md"), join(root, "new.md"));
  await git("add", "old.md", "new.md"); await rm(join(root, "deleted.md"));
  await writeFile(join(root, "notes with spaces.md"), "non-code work");
  const authority = new LocalWorkspaceAuthority({ environmentId: "local", registrations: () => [{ projectId: "project", checkoutId: "repo", path: root }],
    inspectCheckout: createCheckoutInspector("git") });
  const workspace = await authority.prepare({ projectId: "project", checkoutId: "repo", environmentId: "local", path: root, branch: "main", access: "write" });
  const indexBefore = await readFile(join(root, ".git", "index"));
  const review = await createGitReviewer("git", authority)(workspace);
  assert.deepEqual(review, { status: "ready", scope: "workspace",
    paths: ["deleted.md", "new.md", "notes with spaces.md", "old.md", "staged.md", "unstaged.md"] });
  assert.deepEqual(await readFile(join(root, ".git", "index")), indexBefore);
  await git("checkout", "-b", "other");
  await assert.rejects(createGitReviewer("git", authority)(workspace), /identity or branch changed/);
  const plain = join(directory, "plain"); await mkdir(plain);
  assert.deepEqual(await createGitReviewer("git", { async verify() {}, async prepare(selection) { return selection; } })({ ...workspace, path: plain }),
    { status: "unavailable", reason: "unsupported" });
});
