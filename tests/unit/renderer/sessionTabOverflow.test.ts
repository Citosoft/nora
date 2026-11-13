import assert from "node:assert/strict";
import test from "node:test";
import { partitionSessionTabs } from "@/components/app/logic/sessionTabOverflow";
import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";

const tabs: WorkspaceSessionTab[] = Array.from({ length: 4 }, (_, index) => ({
  id: `terminal-${index}`, kind: "terminal", name: `Terminal ${index}`, status: "running"
}));

test("all tabs fit without reserving space for More", () => {
  assert.deepEqual(partitionSessionTabs(tabs, null, 792), { visibleTabs: tabs, overflowTabs: [] });
});

test("overflow reserves room for More and the new tab button", () => {
  const result = partitionSessionTabs(tabs, null, 791);
  assert.deepEqual(result.visibleTabs, tabs.slice(0, 3));
  assert.deepEqual(result.overflowTabs, tabs.slice(3));
});

test("selecting an overflow tab replaces the last visible tab without mutating order", () => {
  const original = [...tabs];
  const result = partitionSessionTabs(tabs, tabs[3].id, 524);
  assert.deepEqual(result.visibleTabs, [tabs[0], tabs[3]]);
  assert.deepEqual(result.overflowTabs, [tabs[1], tabs[2]]);
  assert.deepEqual(tabs, original);
});

test("narrow widths leave every tab accessible through More", () => {
  for (const width of [0, 156, 339]) {
    assert.deepEqual(partitionSessionTabs(tabs, tabs[3].id, width), { visibleTabs: [], overflowTabs: tabs });
  }
});

test("resizing restores tabs and missing or closed active tabs do not hide remaining tabs", () => {
  assert.deepEqual(partitionSessionTabs(tabs, "closed", 524).visibleTabs, tabs.slice(0, 2));
  assert.deepEqual(partitionSessionTabs(tabs, tabs[3].id, 792).visibleTabs, tabs);
  assert.deepEqual(partitionSessionTabs([], null, 792), { visibleTabs: [], overflowTabs: [] });
});
