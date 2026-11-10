import assert from "node:assert/strict";
import test from "node:test";
import { summarizeThreadChanges } from "@/components/app/logic/thread-workspace/insights";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { TurnChange } from "@shared/types/conversation/review.types";

const at = "2026-11-10T10:00:00.000Z";
function change(path: string, patch: string | null): TurnChange {
  return { path, patch, kind: "modified", beforeMode: "100644", afterMode: "100644", beforeHash: null, afterHash: null, presentation: patch === null ? "too-large" : "text" };
}
function review(runId: string, changes: TurnChange[]): TimelineItem {
  return { kind: "review", id: `${runId}:review`, runId, createdAt: at,
    result: { status: "ready", scope: "turn", attribution: "observed", baselineAt: at, capturedAt: at, changes } };
}

test("thread insights count code hunk edits, including lines resembling diff headers", () => {
  const patch = "diff --git a/app.ts b/app.ts\n--- a/app.ts\n+++ b/app.ts\n@@ -1,2 +1,3 @@\n-old\n+new\n++++value\n context\n";
  assert.deepEqual(summarizeThreadChanges([review("run", [change("app.ts", patch)])], false),
    { status: "ready", scope: "turn", files: 1, additions: 2, deletions: 1, reviews: 1, partial: false });
});

test("thread insights deduplicate run reviews and file paths without claiming net edits", () => {
  const patch = "@@ -1 +1 @@\n-old\n+new\n";
  const items = [review("one", [change("app.ts", patch)]), review("one", [change("app.ts", patch)]),
    review("two", [change("app.ts", patch), change("style.css", patch)])];
  assert.deepEqual(summarizeThreadChanges(items, false),
    { status: "ready", scope: "turn", files: 2, additions: 3, deletions: 3, reviews: 2, partial: false });
});

test("thread insights flag partial history and missing patches", () => {
  assert.deepEqual(summarizeThreadChanges([review("one", [change("large.ts", null)])], true),
    { status: "ready", scope: "turn", files: 1, additions: 0, deletions: 0, reviews: 1, partial: true });
  assert.equal(summarizeThreadChanges([review("one", [])], true).status, "ready");
});

test("workspace observations never become thread line counts", () => {
  const item: TimelineItem = { kind: "review", id: "workspace", runId: "run", createdAt: at,
    result: { status: "ready", scope: "workspace", paths: ["preexisting.ts", "preexisting.ts"] } };
  assert.deepEqual(summarizeThreadChanges([item], false),
    { status: "ready", scope: "workspace", files: 1, additions: null, deletions: null, reviews: 0, partial: true });
});

test("missing review evidence and provider-reported paths do not invent statistics", () => {
  const reported: TimelineItem = { kind: "changes", id: "reported", runId: "run", createdAt: at, paths: ["app.ts"], attribution: "turn" };
  assert.deepEqual(summarizeThreadChanges([reported], false), { status: "pending" });
  assert.deepEqual(summarizeThreadChanges([{ kind: "review", id: "missing", runId: "run", createdAt: at,
    result: { status: "unavailable", reason: "interrupted" } }], false), { status: "unavailable" });
});
