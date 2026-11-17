import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { patchLineCounts } from "@shared/conversations/diff";
import { mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { createGitCheckpoints } from "@main/execution/checkpoints/gitService";
import { fileSnapshotSchema, maxFileBytes, maxSnapshotBytes } from "@main/execution/checkpoints/schema";
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

test("large files retain fingerprints while non-Git workspaces and changed workspace identity stay explicitly unavailable", async (t) => {
  const f = await gitFixture(t);
  await f.write("large.bin", Buffer.alloc(maxFileBytes + 1));
  const large = await f.service.capture(f.workspace); assert.ok(large.status === "ready");
  assert.equal(large.snapshot.files.some((file) => file.path === "large.bin"), false);
  assert.deepEqual(large.snapshot.omitted, [{ path: "large.bin", mode: "100644", hash: createHash("sha256").update(Buffer.alloc(maxFileBytes + 1)).digest("hex") }]);
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


test("a new one-line file gets an exact turn diff beside an unchanged oversized image", async (t) => {
  const f = await gitFixture(t);
  await f.write("preview.png", Buffer.alloc(maxFileBytes + 1, 7));
  const baseline = await f.service.capture(f.workspace); assert.ok(baseline.status === "ready");
  await f.write("new.txt", "One line\n");
  const final = await f.service.capture(f.workspace); assert.ok(final.status === "ready");
  const review = await f.service.compare(baseline.snapshot, final.snapshot);
  assert.deepEqual(review.changes.map((change) => [change.path, change.kind]), [["new.txt", "added"]]);
  assert.deepEqual(patchLineCounts(review.changes[0].patch ?? ""), { additions: 1, deletions: 0 });
  await f.write("preview.png", Buffer.alloc(maxFileBytes + 1, 8));
  const changed = await f.service.capture(f.workspace); assert.ok(changed.status === "ready");
  const imageReview = await f.service.compare(final.snapshot, changed.snapshot);
  assert.equal(imageReview.changes.length, 1);
  assert.equal(imageReview.changes[0].path, "preview.png");
  assert.equal(imageReview.changes[0].presentation, "too-large");
  assert.equal(imageReview.changes[0].patch, null);
  assert.notEqual(imageReview.changes[0].beforeHash, imageReview.changes[0].afterHash);
});

test("aggregate capture budgets omit bytes without discarding file identities", async (t) => {
  const f = await gitFixture(t);
  for (let index = 0; index < 9; index++) await f.write(`asset-${index}.txt`, Buffer.alloc(maxFileBytes, 65));
  const result = await f.service.capture(f.workspace); assert.ok(result.status === "ready");
  assert.ok(result.snapshot.omitted?.length);
  assert.ok(result.snapshot.files.reduce((sum, file) => sum + Buffer.byteLength(file.content, "base64"), 0) <= maxSnapshotBytes);
  assert.equal(result.snapshot.files.length + result.snapshot.omitted.length, 11);
  assert.deepEqual((await f.service.compare(result.snapshot, result.snapshot)).changes, []);
  assert.equal(fileSnapshotSchema.safeParse({ ...result.snapshot, omitted: [...result.snapshot.omitted, result.snapshot.omitted[0]] }).success, false);
});
