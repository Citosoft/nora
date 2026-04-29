import { buildFileEditorBreadcrumbs } from "@/components/app/logic/fileEditorPath";
import assert from "node:assert/strict";
import test from "node:test";

test("buildFileEditorBreadcrumbs splits repo-relative paths into breadcrumb segments", () => {
  assert.deepEqual(
    buildFileEditorBreadcrumbs("renderer/components/app/panels/FileEditorPanel.tsx"),
    ["renderer", "components", "app", "panels", "FileEditorPanel.tsx"]
  );
});

test("buildFileEditorBreadcrumbs normalizes Windows separators and ignores duplicate slashes", () => {
  assert.deepEqual(
    buildFileEditorBreadcrumbs("renderer\\components//app\\panels\\FileEditorPanel.tsx"),
    ["renderer", "components", "app", "panels", "FileEditorPanel.tsx"]
  );
});
