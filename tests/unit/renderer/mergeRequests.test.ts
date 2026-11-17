import assert from "node:assert/strict";
import test from "node:test";
import { groupForgeItems, isDraftRequest, requestChangeCounts, selectForgeItems } from "@/components/app/logic/forge-items/list";
import type { ForgeWorkItemFileChange, ForgeWorkItemSummary } from "@shared/appTypes";

const request: ForgeWorkItemSummary = {
  id: "one", number: 1, title: "Improve sidebar", state: "opened", draft: false, author: "Daniel",
  sourceRepository: "team/repo", sourceBranch: "feature/sidebar", targetBranch: "main",
  updatedAt: "2026-11-13T10:00:00Z", webUrl: "https://gitlab.example/team/repo/-/merge_requests/1"
};
const items: ForgeWorkItemSummary[] = [request, { ...request, id: "two", number: 2, title: "Draft: Update browser", draft: true,
  author: "Alex", sourceBranch: "feature/browser", updatedAt: "2026-11-13T12:00:00Z" }];

test("the changes-first table groups open requests before drafts without disturbing each group's sort", () => {
  const newer = { ...request, id: "three", number: 3, updatedAt: "2026-11-13T15:00:00Z" };
  const source = [items[1], request, newer];
  const sorted = selectForgeItems(source, { query: "", filter: "all", sort: "newest" });
  assert.deepEqual(groupForgeItems(sorted), [
    { id: "open", label: "Open requests", items: [newer, request] },
    { id: "draft", label: "Drafts", items: [items[1]] }
  ]);
  assert.deepEqual(source, [items[1], request, newer]);
  assert.deepEqual(groupForgeItems([]), []);
  assert.deepEqual(groupForgeItems([items[1]]), [{ id: "draft", label: "Drafts", items: [items[1]] }]);
});

test("expanded request totals count every loaded file, including renames and files without line changes", () => {
  const changes: ForgeWorkItemFileChange[] = [
    { id: "one", path: "src/new.ts", previousPath: "src/old.ts", additions: 8, deletions: 3, diff: "" },
    { id: "two", path: "assets/logo.png", previousPath: null, additions: 0, deletions: 0, diff: "" },
    { id: "three", path: "src/app.ts", previousPath: null, additions: 12, deletions: 4, diff: "" }
  ];
  assert.deepEqual(requestChangeCounts(changes), { additions: 20, deletions: 7 });
  assert.deepEqual(requestChangeCounts([]), { additions: 0, deletions: 0 });
  assert.equal(changes[0].additions, 8);
});

test("MR search matches all tokens across titles, authors, branches and provider reference syntax", () => {
  for (const query of ["SIDEBAR daniel", "feature/sidebar main", "!1", "#1"]) {
    assert.deepEqual(selectForgeItems(items, { query, filter: "all", sort: "updated" }), [request]);
  }
  assert.deepEqual(selectForgeItems(items, { query: "Daniel browser", filter: "all", sort: "updated" }), []);
});

test("provider draft data takes precedence while older summaries retain draft-title support", () => {
  assert.equal(isDraftRequest({ ...request, title: "Draft: historical title", draft: false }), false);
  assert.equal(isDraftRequest({ ...request, draft: true }), true);
  const { draft: _draft, ...older } = request;
  assert.equal(isDraftRequest({ ...older, title: "WIP: in progress" }), true);
  assert.equal(isDraftRequest({ ...older, state: "draft" }), true);
  assert.equal(isDraftRequest(older), false);
  assert.deepEqual(selectForgeItems(items, { query: "", filter: "draft", sort: "updated" }), [items[1]]);
  assert.deepEqual(selectForgeItems(items, { query: "", filter: "ready", sort: "updated" }), [request]);
});

test("MR sorting is deterministic, tolerates invalid dates and preserves the source list", () => {
  const original = structuredClone(items);
  assert.deepEqual(selectForgeItems(items, { query: " ", filter: "all", sort: "updated" }).map((item) => item.number), [2, 1]);
  assert.deepEqual(selectForgeItems(items, { query: "", filter: "all", sort: "newest" }).map((item) => item.number), [2, 1]);
  assert.deepEqual(selectForgeItems(items, { query: "", filter: "all", sort: "title" }).map((item) => item.number), [2, 1]);
  const invalid = { ...request, id: "invalid", number: 3, updatedAt: "invalid" };
  assert.deepEqual(selectForgeItems([invalid, request], { query: "", filter: "all", sort: "updated" }), [request, invalid]);
  assert.deepEqual(items, original);
});

 test("issues search and sort without interpreting draft-like titles as MR drafts", () => {
  const issues = items.map((item) => ({ ...item, sourceBranch: null, targetBranch: null }));
  const selected = selectForgeItems(issues, { query: "browser alex", filter: "ready", sort: "updated" }, "issue");
  assert.deepEqual(selected, [issues[1]]);
  assert.deepEqual(groupForgeItems(selected, "issue"), [{ id: "open", label: "Open issues", items: [issues[1]] }]);
  assert.deepEqual(selectForgeItems(issues, { query: "#1", filter: "all", sort: "title" }, "issue"), [issues[0]]);
  assert.deepEqual(groupForgeItems([], "issue"), []);
});
