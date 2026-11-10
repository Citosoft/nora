import assert from "node:assert/strict";
import { mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { createGitCheckpoints } from "@main/execution/checkpoints/gitService";
import { maxFileBytes } from "@main/execution/checkpoints/schema";
import { gitFixture } from "./fixture";

test("capture saves actual dirty/untracked bytes without staging or following symlinks", async (t) => {
  const f = await gitFixture(t);
  await f.write("document.md", "Pre-existing edits\n"); await f.git("add", "document.md");
  await f.write("document.md", "Pre-existing staged and unstaged edits\n");
  await f.write("notes with spaces.md", "Notes\n"); await f.write(".gitignore", ".env\n"); await f.write(".env", "secret");
  const outside = join(f.directory, "private.txt"); await writeFile(outside, "never read this content");
  await symlink(outside, join(f.root, "link"));
  const index = await readFile(join(f.root, ".git", "index"));
  const capture = await f.service.capture(f.workspace);
  assert.equal(capture.status, "ready"); assert.ok(capture.status === "ready");
  const document = capture.snapshot.files.find((file) => file.path === "document.md"); assert.ok(document);
  assert.equal(Buffer.from(document.content, "base64").toString(), "Pre-existing staged and unstaged edits\n");
  assert.equal(capture.snapshot.files.some((file) => file.path === ".env"), false);
  const link = capture.snapshot.files.find((file) => file.path === "link"); assert.ok(link);
  assert.equal(link.mode, "120000"); assert.equal(Buffer.from(link.content, "base64").toString(), outside);
  assert.equal(JSON.stringify(capture).includes(Buffer.from("never read this content").toString("base64")), false);
  assert.deepEqual(await readFile(join(f.root, ".git", "index")), index);
  assert.equal((await f.git("show", "HEAD:document.md")).stdout, "Original\n");
});

test("oversized captures, non-Git workspaces and changed workspace identity stay explicitly unavailable", async (t) => {
  const f = await gitFixture(t);
  await f.write("large.bin", Buffer.alloc(maxFileBytes + 1));
  assert.deepEqual(await f.service.capture(f.workspace), { status: "unavailable", reason: "limit-exceeded" });
  await rm(join(f.root, "large.bin"));
  const plain = join(f.directory, "plain"); await mkdir(plain);
  const noChecks = { async verify() {}, async prepare(selection: typeof f.workspace) { return selection; } };
  assert.deepEqual(await createGitCheckpoints("git", noChecks, f.now).capture({ ...f.workspace, path: plain }),
    { status: "unavailable", reason: "unsupported" });
  let checks = 0;
  const changed = createGitCheckpoints("git", { ...noChecks, async verify() { if (++checks === 2) throw new Error("branch changed"); } }, f.now);
  assert.deepEqual(await changed.capture(f.workspace), { status: "unavailable", reason: "workspace-changed" });
});

test("checkpoint capture excludes its own execution database and rejects traversing a replaced parent", async (t) => {
  const f = await gitFixture(t);
  await f.write("execution.sqlite", "host-owned state");
  const service = createGitCheckpoints("git", f.authority, f.now, [join(f.root, "execution.sqlite")]);
  const capture = await service.capture(f.workspace); assert.ok(capture.status === "ready");
  assert.equal(capture.snapshot.files.some((file) => file.path === "execution.sqlite"), false);
  await mkdir(join(f.root, "folder")); await f.write("folder/file.md", "Inside\n"); await f.git("add", "folder/file.md");
  await rename(join(f.root, "folder"), join(f.directory, "outside"));
  await symlink(join(f.directory, "outside"), join(f.root, "folder"), "dir");
  assert.deepEqual(await service.capture(f.workspace), { status: "unavailable", reason: "workspace-changed" });
});
