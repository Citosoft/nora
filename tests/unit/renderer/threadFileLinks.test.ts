import assert from "node:assert/strict";
import test from "node:test";
import { resolveThreadFileLink } from "@/components/app/logic/thread-workspace/fileLinks";

test("chat file links resolve against the thread checkout", () => {
  for (const href of ["src/app.ts", "./src/app.ts", "/repo/src/app.ts", "file:///repo/src/app.ts", "/repo/src/app.ts:12:4", "src/app.ts#L12"]) {
    assert.equal(resolveThreadFileLink("/repo", href), "src/app.ts", href);
  }
  assert.equal(resolveThreadFileLink("/repo/", "docs/my%20file.md"), "docs/my file.md");
  assert.equal(resolveThreadFileLink("C:\\repo", "C:\\repo\\src\\app.ts:12"), "src/app.ts");
});

test("chat file links reject external URLs, invalid paths and checkout escapes", () => {
  for (const href of ["https://example.com", "mailto:user@example.com", "javascript:alert(1)", "#section", "../secret", "/repo-other/file.ts", "/repo/../secret", "file://remote/repo/file.ts", "//remote/file", "bad%ZZ"]) {
    assert.equal(resolveThreadFileLink("/repo", href), null, href);
  }
});
