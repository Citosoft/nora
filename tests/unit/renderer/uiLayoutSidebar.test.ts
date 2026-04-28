import {
  CHANGES_SIDEBAR_AUTO_COLLAPSE_WIDTH,
  clampSidebarWidth,
  MAX_CHANGES_SIDEBAR_WIDTH,
  MAX_WORKSPACE_SIDEBAR_WIDTH,
  MIN_CHANGES_SIDEBAR_WIDTH,
  MIN_WORKSPACE_SIDEBAR_WIDTH,
  WORKSPACE_SIDEBAR_AUTO_COLLAPSE_WIDTH
} from "@/components/app/constants/uiLayout";
import assert from "node:assert/strict";
import test from "node:test";

test("clampSidebarWidth rounds and clamps to inclusive bounds", () => {
  assert.equal(clampSidebarWidth(100.4, 200, 400), 200);
  assert.equal(clampSidebarWidth(250.6, 200, 400), 251);
  assert.equal(clampSidebarWidth(500, 200, 400), 400);
  assert.equal(clampSidebarWidth(300, 300, 300), 300);
});

test("workspace sidebar auto-collapse threshold matches minimum width", () => {
  assert.equal(WORKSPACE_SIDEBAR_AUTO_COLLAPSE_WIDTH, MIN_WORKSPACE_SIDEBAR_WIDTH);
  assert.ok(WORKSPACE_SIDEBAR_AUTO_COLLAPSE_WIDTH <= MAX_WORKSPACE_SIDEBAR_WIDTH);
});

test("changes sidebar auto-collapse threshold matches minimum width", () => {
  assert.equal(CHANGES_SIDEBAR_AUTO_COLLAPSE_WIDTH, MIN_CHANGES_SIDEBAR_WIDTH);
  assert.ok(CHANGES_SIDEBAR_AUTO_COLLAPSE_WIDTH <= MAX_CHANGES_SIDEBAR_WIDTH);
});
