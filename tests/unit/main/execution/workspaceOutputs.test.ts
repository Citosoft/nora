import assert from "node:assert/strict";
import test from "node:test";
import { readWorkspaceOutputs, trimOutputItem } from "@main/execution/workspaceOutputs";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import { fixture } from "./fixture";

const at = "2026-11-18T10:00:00.000Z";
const hash = "a".repeat(64);

test("workspace outputs read only output-bearing items, trimmed, per thread in the project", (t) => {
  const f = fixture(t);
  f.create("first"); f.create("second"); f.create("quiet");
  f.submit("run-1", "first"); f.submit("run-2", "second"); f.submit("run-3", "quiet");
  const accept = (conversationId: string, runId: string, item: TimelineItem) => {
    const run = f.snapshot(conversationId).runs.find((entry) => entry.id === runId);
    assert.ok(run);
    f.engine.accept({ conversationId, runId, attemptId: run.attemptId, eventId: item.id, kind: "item", item });
  };
  accept("first", "run-1", { id: "image", runId: "run-1", createdAt: at, kind: "tool", label: "Generate image", output: "/codex/ig.png", state: "completed",
    details: { category: "image", input: "A red square", detail: "private", outputFiles: [{ path: "/codex/ig.png" }] } });
  accept("first", "run-1", { id: "plain", runId: "run-1", createdAt: at, kind: "tool", label: "Bash", output: "ls", state: "completed", details: { category: "command", input: "ls" } });
  accept("second", "run-2", { id: "write", runId: "run-2", createdAt: at, kind: "tool", label: "Write", output: "Wrote file", state: "completed",
    details: { category: "file", input: "{\"content\":\"secret\"}", outputFiles: [{ path: "/test/second/out.csv" }] } });
  accept("quiet", "run-3", { id: "message", runId: "run-3", createdAt: at, kind: "message", role: "assistant", text: "\"outputFiles\": none here", complete: true });

  const threads = readWorkspaceOutputs(f.store, "project");
  assert.deepEqual(threads.map((thread) => [thread.conversationId, thread.workspacePath, thread.items.map((item) => item.id)]).sort(),
    [["first", "/test/first", ["image"]], ["second", "/test/second", ["write"]]]);
  const items = threads.flatMap((thread) => thread.items);
  assert.deepEqual(items.find((item) => item.id === "image"), { id: "image", runId: "run-1", createdAt: at, kind: "tool", label: "Generate image", output: "",
    state: "completed", details: { category: "image", outputFiles: [{ path: "/codex/ig.png" }], input: "A red square" } });
  const write = items.find((item) => item.id === "write");
  assert.equal(write?.kind === "tool" && write.details?.input, undefined, "tool input other than an image prompt is dropped");
  assert.deepEqual(readWorkspaceOutputs(f.store, "other-project"), []);
});

test("reviewed turns keep their changed paths without patches; other items are not outputs", () => {
  const review: TimelineItem = { id: "review", runId: "run", createdAt: at, kind: "review", result: { status: "ready", scope: "turn", attribution: "observed",
    baselineAt: at, capturedAt: at, changes: [{ path: "report.pdf", kind: "added", beforeMode: null, afterMode: "100644", beforeHash: null, afterHash: hash,
      patch: "diff --git a/report.pdf b/report.pdf", presentation: "binary" }] } };
  const trimmed = trimOutputItem(review);
  assert.equal(trimmed?.kind === "review" && trimmed.result.status === "ready" && trimmed.result.scope === "turn" && trimmed.result.changes[0].patch, null);
  assert.equal(trimOutputItem({ id: "w", runId: "run", createdAt: at, kind: "review", result: { status: "ready", scope: "workspace", paths: ["a.pdf"] } }), null);
  assert.equal(trimOutputItem({ id: "m", runId: "run", createdAt: at, kind: "milestone", text: "Done" }), null);
});
