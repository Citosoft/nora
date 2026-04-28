import {
  isAbsoluteFilesystemPath,
  joinWorkspaceRootAndRelative,
  toStoredPathForWorkspaceAttachment,
  tryStripWorkspaceRootPrefix
} from "@shared/workspaceAbsolutePath";
import assert from "node:assert/strict";
import test from "node:test";

test("joinWorkspaceRootAndRelative uses POSIX separators for Unix roots", () => {
  assert.equal(joinWorkspaceRootAndRelative("/tmp/proj", "src/a.ts"), "/tmp/proj/src/a.ts");
  assert.equal(joinWorkspaceRootAndRelative("/tmp/proj", "lib/"), "/tmp/proj/lib/");
});

test("joinWorkspaceRootAndRelative uses backslashes for Windows drive roots", () => {
  assert.equal(joinWorkspaceRootAndRelative("C:\\Users\\app", "src\\a.ts"), "C:\\Users\\app\\src\\a.ts");
  assert.equal(joinWorkspaceRootAndRelative("C:\\Users\\app", "lib/"), "C:\\Users\\app\\lib\\");
});

test("isAbsoluteFilesystemPath detects common roots", () => {
  assert.equal(isAbsoluteFilesystemPath("/tmp/a"), true);
  assert.equal(isAbsoluteFilesystemPath("C:\\a\\b"), true);
  assert.equal(isAbsoluteFilesystemPath("\\\\server\\share"), true);
  assert.equal(isAbsoluteFilesystemPath("src/a.ts"), false);
});

test("tryStripWorkspaceRootPrefix returns posix-style relative segments", () => {
  assert.equal(tryStripWorkspaceRootPrefix("/tmp/proj/src/a.ts", "/tmp/proj"), "src/a.ts");
  assert.equal(tryStripWorkspaceRootPrefix("C:\\w\\x.ts", "C:\\w"), "x.ts");
});

test("toStoredPathForWorkspaceAttachment keeps absolute path when outside root", () => {
  assert.equal(
    toStoredPathForWorkspaceAttachment("/other/out.ts", "file", "/tmp/proj"),
    "/other/out.ts"
  );
});
