import { isPathWithinComparableRoot, normalizeComparablePath } from "@shared/pathComparison";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeComparablePath normalizes Windows path separators and casing", () => {
  const normalized = normalizeComparablePath("C:/Users/Devuser/Project///", { windows: true });
  assert.equal(normalized, "c:\\users\\devuser\\project");
});

test("normalizeComparablePath trims trailing separators on non-Windows paths", () => {
  const normalized = normalizeComparablePath("/tmp/project///", { windows: false });
  assert.equal(normalized, "/tmp/project");
});

test("isPathWithinComparableRoot matches root and child paths", () => {
  assert.equal(
    isPathWithinComparableRoot("/tmp/project", "/tmp/project", { windows: false }),
    true
  );
  assert.equal(
    isPathWithinComparableRoot("/tmp/project/src/index.ts", "/tmp/project", { windows: false }),
    true
  );
});

test("isPathWithinComparableRoot rejects prefix collisions", () => {
  assert.equal(
    isPathWithinComparableRoot("/tmp/project-2/file.ts", "/tmp/project", { windows: false }),
    false
  );
});

test("isPathWithinComparableRoot is case-insensitive on Windows", () => {
  assert.equal(
    isPathWithinComparableRoot("C:/Users/DEVUSER/Project/src", "c:\\users\\devuser\\project", { windows: true }),
    true
  );
});
