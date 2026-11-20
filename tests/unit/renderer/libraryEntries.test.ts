import assert from "node:assert/strict";
import test from "node:test";
import { buildLibraryEntries, filterLibraryEntries, flattenLibrarySections, groupLibraryEntries, libraryEntryKey, libraryKindCounts, libraryThreadOptions } from "@/components/app/logic/library/libraryEntries";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { OutputThread } from "@shared/types/conversation/queries.types";

const hash = "a".repeat(64);
const produced = (id: string, createdAt: string, paths: string[], input?: string): TimelineItem => ({ id, runId: "run", createdAt, kind: "tool", label: "Tool",
  output: "", state: "completed", details: { category: input ? "image" : "file", ...(input ? { input } : {}), outputFiles: paths.map((path) => ({ path })) } });
const review = (id: string, createdAt: string, path: string): TimelineItem => ({ id, runId: "run", createdAt, kind: "review", result: { status: "ready", scope: "turn",
  attribution: "observed", baselineAt: createdAt, capturedAt: createdAt, changes: [{ path, kind: "added", beforeMode: null, afterMode: "100644", beforeHash: null,
    afterHash: hash, patch: null, presentation: "binary" }] } });
const thread = (conversationId: string, title: string, items: TimelineItem[], workspacePath = "/project"): OutputThread =>
  ({ conversationId, title, workspacePath, updatedAt: "2026-11-18T12:00:00.000Z", archived: false, items });

const threads = [
  thread("charts", "Make charts", [produced("t1", "2026-11-18T09:00:00.000Z", ["/tmp/chart.png"], "A bar chart"), review("r1", "2026-11-17T09:00:00.000Z", "docs/report.pdf")]),
  thread("report", "Write report", [review("r2", "2026-11-18T11:00:00.000Z", "docs/report.pdf"), review("r3", "2026-10-01T09:00:00.000Z", "data/old.csv")]),
  thread("worktree", "Worktree work", [review("r4", "2026-11-12T09:00:00.000Z", "docs/report.pdf")], "/project-wt")
];

test("the library lists each file once, newest first, under the thread that touched it last", () => {
  const entries = buildLibraryEntries(threads);
  assert.deepEqual(entries.map((entry) => [entry.name, entry.threadTitle, entry.rootPath]), [
    ["report.pdf", "Write report", "/project"], ["chart.png", "Make charts", "/project"], ["report.pdf", "Worktree work", "/project-wt"], ["old.csv", "Write report", "/project"]
  ]);
  assert.deepEqual(libraryThreadOptions(entries), [{ conversationId: "report", title: "Write report", count: 2 },
    { conversationId: "charts", title: "Make charts", count: 1 }, { conversationId: "worktree", title: "Worktree work", count: 1 }]);
  assert.deepEqual(libraryKindCounts(entries), { document: 2, image: 1, sheet: 1 });
});

test("filters combine search, type and thread", () => {
  const entries = buildLibraryEntries(threads);
  const names = (filter: Parameters<typeof filterLibraryEntries>[1]) => filterLibraryEntries(entries, filter).map((entry) => `${entry.conversationId}:${entry.name}`);
  assert.deepEqual(names({ query: "", kind: "document", conversationId: null }), ["report:report.pdf", "worktree:report.pdf"]);
  assert.deepEqual(names({ query: "bar CHART", kind: "all", conversationId: null }), ["charts:chart.png"], "searches the generated image's prompt");
  assert.deepEqual(names({ query: "write", kind: "all", conversationId: null }), ["report:report.pdf", "report:old.csv"], "searches thread titles");
  assert.deepEqual(names({ query: "", kind: "all", conversationId: "worktree" }), ["worktree:report.pdf"]);
  assert.deepEqual(names({ query: "", kind: "video", conversationId: null }), []);
});

test("outputs group by calendar date, by thread, or by type in a fixed order", () => {
  const entries = buildLibraryEntries(threads);
  const now = new Date(2026, 10, 18, 15);
  const shape = (grouping: "date" | "thread" | "type") => groupLibraryEntries(entries, grouping, now).map((section) => [section.label, section.entries.map((entry) => entry.name)]);
  assert.deepEqual(shape("date").slice(0, 2), [["Today", ["report.pdf", "chart.png"]], ["Previous 7 days", ["report.pdf"]]]);
  assert.equal(shape("date")[2][0], new Date(2026, 9, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }));
  assert.deepEqual(shape("thread"), [["Write report", ["report.pdf", "old.csv"]], ["Make charts", ["chart.png"]], ["Worktree work", ["report.pdf"]]]);
  assert.deepEqual(shape("type"), [["Images", ["chart.png"]], ["Documents", ["report.pdf", "report.pdf"]], ["Spreadsheets", ["old.csv"]]]);
});

test("the viewer steps through entries in the order the grid shows them", () => {
  const sections = groupLibraryEntries(buildLibraryEntries(threads), "type", new Date(2026, 10, 18, 15));
  assert.deepEqual(flattenLibrarySections(sections).map(libraryEntryKey),
    ["charts:/tmp/chart.png", "report:/project/docs/report.pdf", "worktree:/project-wt/docs/report.pdf", "report:/project/data/old.csv"]);
});
