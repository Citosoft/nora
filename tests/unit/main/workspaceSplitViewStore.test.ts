import { normalizeWorkspaceSplitViewCollection } from "@main/workspaceSplitViewStore";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeWorkspaceSplitViewCollection preserves browser and file tile references", () => {
  const normalized = normalizeWorkspaceSplitViewCollection({
    version: 1,
    views: [
      {
        id: "view-1",
        name: "Daily",
        gridColumns: 2,
        gridRows: 2,
        createdAt: "2026-05-06T12:00:00.000Z",
        updatedAt: "2026-05-06T12:00:00.000Z",
        tiles: [
          {
            id: "tile-browser",
            item: {
              kind: "browser",
              tabId: "browser-1"
            },
            column: 1,
            row: 1,
            width: 3,
            height: 2
          },
          {
            id: "tile-file",
            item: {
              kind: "file",
              path: "specs/launch.md"
            },
            column: 2,
            row: 1,
            width: 2,
            height: 2
          }
        ]
      }
    ]
  });

  assert.equal(normalized.collection.views[0]?.tiles[0]?.item.kind, "browser");
  assert.deepEqual(normalized.collection.views[0]?.tiles[0]?.item, {
    kind: "browser",
    tabId: "browser-1"
  });
  assert.deepEqual(normalized.collection.views[0]?.tiles[1]?.item, {
    kind: "file",
    path: "specs/launch.md"
  });
});

test("normalizeWorkspaceSplitViewCollection drops invalid split-view tile references", () => {
  const normalized = normalizeWorkspaceSplitViewCollection({
    version: 1,
    views: [
      {
        id: "view-1",
        name: "Daily",
        gridColumns: 2,
        gridRows: 2,
        createdAt: "2026-05-06T12:00:00.000Z",
        updatedAt: "2026-05-06T12:00:00.000Z",
        tiles: [
          {
            id: "tile-invalid-browser",
            item: {
              kind: "browser"
            },
            column: 1,
            row: 1,
            width: 1,
            height: 1
          },
          {
            id: "tile-invalid-file",
            item: {
              kind: "file"
            },
            column: 2,
            row: 1,
            width: 1,
            height: 1
          }
        ]
      }
    ]
  });

  assert.deepEqual(normalized.collection.views[0]?.tiles, []);
});
