import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { ClaudeStreamNormalizer } from "@main/providers/claude/streamNormalizer";
import type { ClaudeFrame } from "@main/types/execution/claude.types";
import { claudeAssistantMessage, claudeUserMessage } from "./toolFixtures";

const agentCall = claudeAssistantMessage([{ type: "tool_use", id: "agent", name: "Agent",
  input: { description: "Review the diff", prompt: "Review src/main.ts", subagent_type: "code-reviewer", model: "haiku", effort: "low" } }]);
const subagents = (frames: ClaudeFrame[]) => frames.filter((frame) => frame.kind === "subagent");
const tools = (frames: ClaudeFrame[]) => frames.filter((frame) => frame.kind === "tool");

test("a Claude Agent call becomes a subagent whose nested tools and text report its progress", () => {
  const normalizer = new ClaudeStreamNormalizer();
  const started = normalizer.accept(agentCall);
  assert.deepEqual(tools(started), []);
  const [agent] = subagents(started);
  assert.equal(agent.nativeId, "agent"); assert.equal(agent.label, "Review the diff"); assert.equal(agent.state, "running");
  assert.equal(agent.agentType, "code-reviewer"); assert.equal(agent.prompt, "Review src/main.ts");
  assert.equal(agent.model, "haiku", "the requested model shows until the agent reports one"); assert.equal(agent.effort, "low");

  const base = { task_id: "task", tool_use_id: "agent", session_id: "session" };
  const taskFrames = normalizer.accept({ ...base, uuid: randomUUID(), type: "system", subtype: "task_started", description: "Review the diff", task_type: "local_agent" });
  assert.deepEqual(tools(taskFrames), [], "subagent tasks are not duplicated as background tools");

  const nested = normalizer.accept(claudeAssistantMessage([{ type: "text", text: "Reading the changed files", citations: null },
    { type: "tool_use", id: "read", name: "Read", input: { file_path: "/workspace/src/main.ts" } }], "agent"));
  assert.equal(subagents(nested)[0].progress, "Reading the changed files");
  assert.equal(subagents(nested)[0].model, "fixture", "the agent's own response names the model that ran");
  assert.equal(tools(nested)[0].details?.parentId, "agent", "nested tools link to the agent");
  assert.ok(!nested.some((frame) => frame.kind === "text"), "subagent text stays out of the main transcript");

  const [done] = subagents(normalizer.accept(claudeUserMessage([{ type: "tool_result", tool_use_id: "agent", content: "One issue found." }])));
  assert.equal(done.state, "completed"); assert.equal(done.result, "One issue found.");
  assert.deepEqual(subagents(normalizer.accept({ ...base, uuid: randomUUID(), type: "system", subtype: "task_progress", description: "late",
    usage: { total_tokens: 1, tool_uses: 1, duration_ms: 1 } })).filter((frame) => frame.state === "running"), [], "late progress cannot reopen a finished agent");
});

test("background Claude agents ignore the placeholder result and finish from their task notification", () => {
  const normalizer = new ClaudeStreamNormalizer();
  normalizer.accept(agentCall);
  const base = { task_id: "task", tool_use_id: "agent", session_id: "session" };
  normalizer.accept({ ...base, uuid: randomUUID(), type: "system", subtype: "task_started", description: "Review the diff", is_backgrounded: true });
  assert.deepEqual(subagents(normalizer.accept(claudeUserMessage([{ type: "tool_result", tool_use_id: "agent", content: "Async agent launched" }]))), []);
  const [progress] = subagents(normalizer.accept({ ...base, uuid: randomUUID(), type: "system", subtype: "task_progress", description: "Review the diff",
    summary: "Checking retry handling", usage: { total_tokens: 1, tool_uses: 1, duration_ms: 1 } }));
  assert.equal(progress.progress, "Checking retry handling"); assert.equal(progress.state, "running");
  const [failed] = subagents(normalizer.accept({ ...base, uuid: randomUUID(), type: "system", subtype: "task_notification", status: "failed", output_file: "/unused", summary: "Could not read files" }));
  assert.equal(failed.state, "failed"); assert.equal(failed.result, "Could not read files");
});

test("non-agent background tasks remain tool activity", () => {
  const normalizer = new ClaudeStreamNormalizer();
  const frames = normalizer.accept({ task_id: "shell", tool_use_id: "bash", session_id: "session", uuid: randomUUID(), type: "system", subtype: "task_started", description: "npm run watch", task_type: "local_bash" });
  assert.deepEqual(subagents(frames), []);
  assert.equal(tools(frames)[0].label, "npm run watch");
});
