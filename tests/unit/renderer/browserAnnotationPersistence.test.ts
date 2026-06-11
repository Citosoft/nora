import {
  buildBrowserAnnotationStorageKey,
  normalizeStoredBrowserAnnotation,
  readStoredBrowserAnnotationsForScope,
  writeStoredBrowserAnnotationsForScope
} from "@/components/app/logic/browserAnnotationPersistence";
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

test("buildBrowserAnnotationStorageKey scopes annotations to project and browser tab", () => {
  assert.equal(buildBrowserAnnotationStorageKey("project-1", "tab-1"), "project-1::tab-1");
});

test("normalizeStoredBrowserAnnotation rejects incomplete entries", () => {
  assert.equal(normalizeStoredBrowserAnnotation(null), null);
  assert.equal(
    normalizeStoredBrowserAnnotation({
      id: "a",
      body: "comment",
      createdAt: "2026-06-03T12:00:00.000Z",
      target: { pageUrl: "", selector: "div", tagName: "DIV" }
    }),
    null
  );
});

test("writeStoredBrowserAnnotationsForScope round-trips through localStorage", () => {
  const storage = new LocalStorageMock();
  installWindowMock(storage);

  const scopeKey = buildBrowserAnnotationStorageKey("project-1", "tab-1");
  const annotation = {
    id: "annotation-1",
    createdAt: "2026-06-03T12:00:00.000Z",
    body: "Fix alignment",
    target: {
      pageUrl: "https://example.com",
      pageTitle: "Example",
      selector: "button.submit",
      selectorFallbacks: [],
      tagName: "BUTTON",
      textPreview: "Submit",
      htmlSnippet: "<button>Submit</button>",
      attributes: {}
    }
  };

  writeStoredBrowserAnnotationsForScope(scopeKey, [annotation]);
  const stored = readStoredBrowserAnnotationsForScope(scopeKey);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]?.body, "Fix alignment");

  writeStoredBrowserAnnotationsForScope(scopeKey, []);
  assert.equal(readStoredBrowserAnnotationsForScope(scopeKey).length, 0);
  assert.equal(storage.getItem("nora-browser-annotations"), null);
});
