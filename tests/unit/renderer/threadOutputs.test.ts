import assert from "node:assert/strict";
import test from "node:test";
import { checkoutRelativePath, collectThreadOutputs, threadOutputKind, toolOutputImages } from "@/components/app/logic/thread-workspace/outputs";
import type { TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";

const createdAt = "2026-11-18T10:00:00.000Z";
const hash = "a".repeat(64);

function review(runId: string, changes: [string, "added" | "modified" | "deleted"][], scope: "turn" | "workspace" = "turn"): TimelineItem {
  return { id: `review-${runId}`, runId, createdAt, kind: "review", result: scope === "workspace" ? { status: "ready", scope: "workspace", paths: changes.map(([path]) => path) }
    : { status: "ready", scope: "turn", attribution: "observed", baselineAt: createdAt, capturedAt: createdAt, changes: changes.map(([path, kind]) => ({
      path, kind, beforeMode: null, afterMode: "100644", beforeHash: null, afterHash: hash, patch: null, presentation: "binary" })) } };
}

function produced(id: string, paths: string[], input?: string, category: "image" | "file" | "other" = "image"): ToolActivity {
  return { id, runId: "turn", createdAt, kind: "tool", label: "Tool", output: "", state: "completed",
    details: { category, ...(input ? { input } : {}), outputFiles: paths.map((path) => ({ path })) } };
}

test("only non-code files count as outputs", () => {
  assert.deepEqual(["chart.png", "clip.mp4", "voice.mp3", "data.csv", "bundle.zip", "report.pdf", "deck.pptx"].map(threadOutputKind),
    ["image", "video", "audio", "sheet", "archive", "document", "document"]);
  for (const path of ["src/app.ts", "README.md", "notes.txt", "package.json", "Makefile"]) assert.equal(threadOutputKind(path), null);
  assert.deepEqual(toolOutputImages(produced("t", ["/a/chart.png", "/a/report.pdf", "/a/app.ts"])), ["/a/chart.png"]);
});

test("checkout-relative paths exist only for files inside the checkout", () => {
  assert.equal(checkoutRelativePath("/project/", "/project/out/chart.png"), "out/chart.png");
  assert.equal(checkoutRelativePath("/project", "/project-other/chart.png"), null);
  assert.equal(checkoutRelativePath("/project", "/tmp/chart.png"), null);
});

test("outputs list tool and reviewed non-code files newest first, one row per file in its latest state", () => {
  const outputs = collectThreadOutputs([
    review("one", [["docs/report.pdf", "added"], ["src/app.ts", "modified"], ["assets/old.png", "added"]]),
    produced("image", ["/codex/generated_images/ig_1.png"], " A red square "),
    produced("deliver", ["/tmp/nora-test.png", "/tmp/notes.md"], "{\"files\":[]}", "other"),
    review("two", [["assets/old.png", "deleted"], ["data/results.csv", "added"]]),
    produced("write", ["/project/docs/report.pdf"], undefined, "file"),
    review("four", [["unrelated.zip", "added"]], "workspace")
  ], "/project");
  assert.deepEqual(outputs, [
    { source: "tool", key: "/project/docs/report.pdf", kind: "document", itemId: "write", path: "/project/docs/report.pdf", name: "report.pdf", description: null, createdAt },
    { source: "workspace", key: "/project/data/results.csv", kind: "sheet", itemId: "review-two", path: "data/results.csv", name: "results.csv", createdAt },
    { source: "tool", key: "/tmp/nora-test.png", kind: "image", itemId: "deliver", path: "/tmp/nora-test.png", name: "nora-test.png", description: null, createdAt },
    { source: "tool", key: "/codex/generated_images/ig_1.png", kind: "image", itemId: "image", path: "/codex/generated_images/ig_1.png", name: "ig_1.png", description: "A red square", createdAt }
  ]);
});

test("threads without output files or reviews have no outputs", () => {
  const plain: ToolActivity = { ...produced("image", []), details: { category: "image" } };
  assert.deepEqual(collectThreadOutputs([plain], "/project"), []);
  assert.deepEqual(collectThreadOutputs([], "/project"), []);
});
