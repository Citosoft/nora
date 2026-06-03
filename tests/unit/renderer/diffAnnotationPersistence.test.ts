import {
  buildDiffAnnotationStorageKey,
  normalizeStoredDiffAnnotation,
  readStoredDiffAnnotationsForScope,
  writeStoredDiffAnnotationsForScope
} from "@/components/app/logic/diffAnnotationPersistence";
import type { DiffAnnotation } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

class LocalStorageMock {
  private values = new Map<string, string>();

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function installWindowMock(storage: LocalStorageMock): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { localStorage: storage }
  });
}

const sampleAnnotation: DiffAnnotation = {
  id: "annotation-1",
  createdAt: "2026-06-03T12:00:00.000Z",
  body: "Rename this helper.",
  target: {
    path: "src/a.ts",
    oldLine: null,
    newLine: 12,
    lineText: "+const value = 1;"
  }
};

test("buildDiffAnnotationStorageKey scopes annotations by project and changes root", () => {
  assert.equal(buildDiffAnnotationStorageKey("project-1", "/tmp/worktree-a"), "project-1::/tmp/worktree-a");
  assert.equal(buildDiffAnnotationStorageKey("project-1", null), "project-1::");
});

test("normalizeStoredDiffAnnotation rejects invalid persisted entries", () => {
  assert.equal(normalizeStoredDiffAnnotation(null), null);
  assert.equal(normalizeStoredDiffAnnotation({ ...sampleAnnotation, body: "   " }), null);
  assert.equal(normalizeStoredDiffAnnotation({ ...sampleAnnotation, target: { ...sampleAnnotation.target, oldLine: null, newLine: null } }), null);
});

test("writeStoredDiffAnnotationsForScope persists and restores per workspace scope", () => {
  const storage = new LocalStorageMock();
  installWindowMock(storage);

  const scopeA = buildDiffAnnotationStorageKey("project-a", "/tmp/a");
  const scopeB = buildDiffAnnotationStorageKey("project-b", "/tmp/b");

  writeStoredDiffAnnotationsForScope(scopeA, [sampleAnnotation]);
  writeStoredDiffAnnotationsForScope(scopeB, [
    {
      ...sampleAnnotation,
      id: "annotation-2",
      target: { ...sampleAnnotation.target, path: "src/b.ts" }
    }
  ]);

  assert.deepEqual(readStoredDiffAnnotationsForScope(scopeA), [sampleAnnotation]);
  assert.equal(readStoredDiffAnnotationsForScope(scopeB)[0]?.target.path, "src/b.ts");

  writeStoredDiffAnnotationsForScope(scopeA, []);
  assert.deepEqual(readStoredDiffAnnotationsForScope(scopeA), []);
  assert.equal(readStoredDiffAnnotationsForScope(scopeB)[0]?.id, "annotation-2");
});
