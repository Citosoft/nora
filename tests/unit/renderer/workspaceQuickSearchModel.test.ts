import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceQuickSearchRows, workspaceQuickSearchResults } from "@/components/app/logic/workspaceQuickSearchModel";

test("Quick Search caps each group independently and keeps group and file order", () => {
  const names = Array.from({ length: 40 }, (_, i) => `match-${String(i).padStart(2, "0")}`);
  const groups = buildWorkspaceQuickSearchRows({ agents: [], terminals: [], tasks: [], specs: [],
    notes: names.map((title) => ({ title, path: title, projectId: "p", projectName: "Project" })),
    filePaths: ["node_modules/match", ...names.slice().reverse()] });
  for (const [query, limit] of [["", 12], ["MATCH", 25]] as const) {
    const results = workspaceQuickSearchResults(groups, query);
    assert.deepEqual(results.map((row) => row.key), [
      ...names.slice(0, limit).map((name) => `note:p:${name}`), ...names.slice(0, limit).map((name) => `file:${name}`)
    ]);
  }
});
