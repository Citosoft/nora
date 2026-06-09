import {
  deleteProjectScaffoldFavorite,
  readStoredProjectScaffoldFavorites,
  saveProjectScaffoldFavorite
} from "@/components/app/logic/projectScaffoldFavorites";
import type { ProjectScaffoldFavorite } from "@/components/app/types/projectScaffoldWizard.types";
import assert from "node:assert/strict";
import test from "node:test";

type LocalStorageHarness = {
  values: Map<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function withLocalStorage<T>(run: (storage: LocalStorageHarness) => T): T {
  const storage: LocalStorageHarness = {
    values: new Map<string, string>(),
    getItem(key) {
      return this.values.get(key) ?? null;
    },
    setItem(key, value) {
      this.values.set(key, value);
    }
  };
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage }
  });

  try {
    return run(storage);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  }
}

function createFavorite(overrides: Partial<ProjectScaffoldFavorite> = {}): ProjectScaffoldFavorite {
  return {
    id: "favorite-1",
    name: "Web stack",
    frameworkId: "nextjs",
    componentIds: ["typescript", "tailwind"],
    testingIds: ["vitest"],
    toolId: "codex",
    createdAt: "2026-06-09T10:00:00.000Z",
    updatedAt: "2026-06-09T10:00:00.000Z",
    ...overrides
  };
}

test("saveProjectScaffoldFavorite persists a new favorite", () => withLocalStorage(() => {
  const next = saveProjectScaffoldFavorite([], {
    name: " Web stack ",
    frameworkId: "nextjs",
    componentIds: ["typescript"],
    testingIds: ["playwright"],
    toolId: "codex"
  }, "2026-06-09T11:00:00.000Z", () => "favorite-1");

  assert.deepEqual(next, [createFavorite({
    componentIds: ["typescript"],
    testingIds: ["playwright"],
    createdAt: "2026-06-09T11:00:00.000Z",
    updatedAt: "2026-06-09T11:00:00.000Z"
  })]);
  assert.deepEqual(readStoredProjectScaffoldFavorites(), next);
}));

test("saveProjectScaffoldFavorite replaces a case-insensitive name match", () => withLocalStorage(() => {
  const original = createFavorite();
  const next = saveProjectScaffoldFavorite([original], {
    name: "web STACK",
    frameworkId: "astro",
    componentIds: ["mdx"],
    testingIds: ["playwright"],
    toolId: "claude"
  }, "2026-06-09T12:00:00.000Z", () => "unused-id");

  assert.equal(next.length, 1);
  assert.equal(next[0]?.id, original.id);
  assert.equal(next[0]?.createdAt, original.createdAt);
  assert.equal(next[0]?.frameworkId, "astro");
}));

test("deleteProjectScaffoldFavorite removes and persists the favorite", () => withLocalStorage(() => {
  const favorite = createFavorite();
  saveProjectScaffoldFavorite([], favorite, favorite.updatedAt, () => favorite.id);

  assert.deepEqual(deleteProjectScaffoldFavorite([favorite], favorite.id), []);
  assert.deepEqual(readStoredProjectScaffoldFavorites(), []);
}));

test("readStoredProjectScaffoldFavorites ignores malformed entries", () => withLocalStorage((storage) => {
  storage.setItem("nora-project-scaffold-favorites-v1", JSON.stringify([
    createFavorite(),
    { id: "broken", name: 12 }
  ]));

  assert.deepEqual(readStoredProjectScaffoldFavorites(), [createFavorite()]);
}));
