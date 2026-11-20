import assert from "node:assert/strict";
import test from "node:test";
import { openOutput } from "@/components/app/logic/thread-workspace/openOutput";
import type { OutputFileContent } from "@shared/types/conversation/queries.types";
import type { OpenWorkspaceFileEditorOptions } from "@/components/app/types/workflow.types";

function harness(file: OutputFileContent | null) {
  const viewer: [string, OpenWorkspaceFileEditorOptions | undefined][] = [];
  const system: string[] = [];
  return { viewer, system, deps: { rootPath: "/project",
    host: { read: async () => file, openWithSystem: async (_itemId: string, path: string) => { system.push(path); } },
    openFileEditor: async (path: string, options?: OpenWorkspaceFileEditorOptions) => { viewer.push([path, options]); } } };
}

test("checkout images and documents open in the file viewer directly; other checkout files are checked first", async () => {
  const run = harness({ kind: "text", text: "a,b" });
  assert.deepEqual(await openOutput(run.deps, { source: "workspace", itemId: "r", path: "docs/report.pdf" }), { opened: "viewer", path: "docs/report.pdf" });
  assert.deepEqual(await openOutput(run.deps, { source: "tool", itemId: "t", path: "/project/out/chart.png" }), { opened: "viewer", path: "out/chart.png" });
  assert.deepEqual(await openOutput(run.deps, { source: "workspace", itemId: "r", path: "data/results.csv" }), { opened: "viewer", path: "data/results.csv" });
  assert.deepEqual(run.viewer.map(([path, options]) => [path, options?.rootPath, options?.isReadOnly]),
    [["docs/report.pdf", "/project", undefined], ["out/chart.png", "/project", undefined], ["data/results.csv", "/project", undefined]]);
  const archive = harness({ kind: "unsupported" });
  assert.deepEqual(await openOutput(archive.deps, { source: "workspace", itemId: "r", path: "dist/bundle.zip" }), { opened: "system" });
  assert.deepEqual(archive.viewer, [], "binary checkout files never open as text");
  assert.deepEqual(await openOutput({ ...archive.deps, unsupported: "report" }, { source: "workspace", itemId: "r", path: "dist/bundle.zip" }), { opened: "unsupported" });
  assert.deepEqual(archive.system, ["dist/bundle.zip"], "report mode leaves opening to the caller");
});

test("files elsewhere open read-only with the host's content, or with the system when the viewer can't show them", async () => {
  const text = harness({ kind: "text", text: "a,b" });
  assert.deepEqual(await openOutput(text.deps, { source: "tool", itemId: "t", path: "/tmp/data.csv" }), { opened: "viewer", path: "/tmp/data.csv" });
  assert.deepEqual(text.viewer[0][1], { selectChange: false, isReadOnly: true, prefetched: { kind: "text", content: "a,b" } });
  const image = harness({ kind: "image", preview: { dataUrl: "data:image/webp;base64,AA", width: 1, height: 1 } });
  await openOutput(image.deps, { source: "tool", itemId: "t", path: "/tmp/chart.png" });
  assert.deepEqual(image.viewer[0][1]?.prefetched, { kind: "image", dataUrl: "data:image/webp;base64,AA", mimeType: "image/webp" });
  const zip = harness({ kind: "unsupported" });
  assert.deepEqual(await openOutput(zip.deps, { source: "tool", itemId: "t", path: "/tmp/bundle.zip" }), { opened: "system" });
  assert.deepEqual(zip.system, ["/tmp/bundle.zip"]);
  await assert.rejects(openOutput(harness(null).deps, { source: "tool", itemId: "t", path: "/tmp/gone.png" }), /no longer available/);
  const noViewer = harness({ kind: "text", text: "a" });
  assert.deepEqual(await openOutput({ ...noViewer.deps, openFileEditor: null }, { source: "tool", itemId: "t", path: "/tmp/data.csv" }), { opened: "system" });
});
