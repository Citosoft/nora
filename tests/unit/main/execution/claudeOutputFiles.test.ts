import assert from "node:assert/strict";
import { normalize, resolve } from "node:path";
import test from "node:test";
import { claudeToolOutputFiles } from "@main/providers/claude/outputFiles";
import { ClaudeToolActivity } from "@main/providers/claude/toolActivity";
import { claudeAssistantMessage, claudeUserMessage } from "./toolFixtures";

test("Claude Write and SendUserFile calls name their files as absolute outputs", () => {
  assert.deepEqual(claudeToolOutputFiles("Write", { file_path: "/project/out/chart.png", content: "…" }), [{ path: normalize("/project/out/chart.png") }]);
  assert.deepEqual(claudeToolOutputFiles("SendUserFile", { files: ["/tmp/a.png", "b.pdf", "/tmp/a.png"] }, "/project"),
    [{ path: normalize("/tmp/a.png") }, { path: resolve("/project", "b.pdf") }]);
  assert.deepEqual(claudeToolOutputFiles("SendUserFile", { files: ["b.pdf"] }), [], "relative paths need a known working directory");
  assert.deepEqual(claudeToolOutputFiles("Read", { file_path: "/project/chart.png" }), []);
  assert.deepEqual(claudeToolOutputFiles("Write", { content: "missing path" }), []);
});

test("live Claude tools keep output files only once their result succeeds", () => {
  const tools = new ClaudeToolActivity();
  const [running] = tools.accept(claudeAssistantMessage([{ type: "tool_use", id: "deliver", name: "SendUserFile", input: { files: ["/tmp/chart.png"] } },
    { type: "tool_use", id: "write", name: "Write", input: { file_path: "/tmp/report.pdf", content: "…" } }]));
  assert.equal(running.details?.outputFiles, undefined);
  const [delivered] = tools.accept(claudeUserMessage([{ type: "tool_result", tool_use_id: "deliver", content: "1 file delivered to user." }]));
  assert.deepEqual(delivered.details?.outputFiles, [{ path: normalize("/tmp/chart.png") }]);
  const [failed] = tools.accept(claudeUserMessage([{ type: "tool_result", tool_use_id: "write", content: "Disk full", is_error: true }]));
  assert.equal(failed.details?.outputFiles, undefined);
});
