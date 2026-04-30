import {
  buildCloseDirtyFileEditorTabMessage,
  closeFileEditorTab,
  findFileEditorTab,
  isDirtyFileEditorTab
} from "@/components/app/logic/fileEditorTabs";
import type { FileEditorState, FileEditorTab } from "@/components/app/types";
import assert from "node:assert/strict";
import test from "node:test";

function createTextTab(overrides: Partial<FileEditorTab> = {}): FileEditorTab {
  return {
    projectId: "project-1",
    path: "src/app.ts",
    rootPath: "/repo",
    kind: "text",
    content: "next",
    savedContent: "saved",
    imageDataUrl: null,
    imageMimeType: null,
    isLoading: false,
    isSaving: false,
    errorMessage: null,
    ...overrides
  };
}

test("isDirtyFileEditorTab only marks changed text tabs as dirty", () => {
  assert.equal(isDirtyFileEditorTab(createTextTab()), true);
  assert.equal(isDirtyFileEditorTab(createTextTab({ content: "same", savedContent: "same" })), false);
  assert.equal(
    isDirtyFileEditorTab(
      createTextTab({
        kind: "image",
        content: "",
        savedContent: ""
      })
    ),
    false
  );
});

test("buildCloseDirtyFileEditorTabMessage names the edited file being closed", () => {
  assert.equal(
    buildCloseDirtyFileEditorTabMessage(createTextTab({ path: "docs/guide.md" })),
    'Discard unsaved changes to "guide.md"?'
  );
  assert.equal(
    buildCloseDirtyFileEditorTabMessage(createTextTab({ content: "same", savedContent: "same" })),
    null
  );
});

test("findFileEditorTab returns the matching tab when present", () => {
  const state: FileEditorState = {
    activePath: "docs/guide.md",
    tabs: [createTextTab({ path: "docs/guide.md" }), createTextTab({ path: "src/app.ts" })]
  };

  assert.equal(findFileEditorTab(state, "src/app.ts")?.path, "src/app.ts");
  assert.equal(findFileEditorTab(state, "missing.ts"), null);
});

test("closeFileEditorTab removes the active tab and focuses the next available tab", () => {
  const state: FileEditorState = {
    activePath: "b.ts",
    tabs: [
      createTextTab({ path: "a.ts" }),
      createTextTab({ path: "b.ts" }),
      createTextTab({ path: "c.ts" })
    ]
  };

  assert.deepEqual(closeFileEditorTab(state, "b.ts"), {
    activePath: "c.ts",
    tabs: [createTextTab({ path: "a.ts" }), createTextTab({ path: "c.ts" })]
  });
});

test("closeFileEditorTab keeps the current active tab when closing a different tab", () => {
  const state: FileEditorState = {
    activePath: "c.ts",
    tabs: [
      createTextTab({ path: "a.ts" }),
      createTextTab({ path: "b.ts" }),
      createTextTab({ path: "c.ts" })
    ]
  };

  assert.deepEqual(closeFileEditorTab(state, "a.ts"), {
    activePath: "c.ts",
    tabs: [createTextTab({ path: "b.ts" }), createTextTab({ path: "c.ts" })]
  });
});

test("closeFileEditorTab clears the state when the last tab closes", () => {
  const state: FileEditorState = {
    activePath: "a.ts",
    tabs: [createTextTab({ path: "a.ts" })]
  };

  assert.equal(closeFileEditorTab(state, "a.ts"), null);
});
