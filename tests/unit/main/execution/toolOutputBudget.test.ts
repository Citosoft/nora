import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, stat, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { PostToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import type { StdioRpc } from "@main/providers/codex/stdioRpc";
import { budgetToolOutput } from "@main/execution/tool-output/budget";
import { createClaudeOutputHook, claudeOutputOptions } from "@main/providers/claude/outputBudget";
import { codexOutputConfig } from "@main/providers/codex/outputBudget";

const largeText = `${"Starting check 😀\n".repeat(2_000)}ERROR src/parser.ts:42: invalid input\n${"Finishing check 界\n".repeat(2_000)}Exit status: 1`;
const hookInput: PostToolUseHookInput = { session_id: "test", transcript_path: "/unused", cwd: "/unused", hook_event_name: "PostToolUse", tool_use_id: "tool", tool_name: "Bash", tool_input: {}, tool_response: null };
const rewrittenShellSchema = z.object({ stdout: z.string(), stderr: z.string(), interrupted: z.boolean(), exitCode: z.number() });

test("budgeted output preserves full Unicode text and bounds excerpts while retaining middle diagnostics and final status", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-output-budget-")); t.after(() => rm(directory, { recursive: true, force: true }));
  for (const max of [2_000, 8_000]) {
    const result = await budgetToolOutput(largeText, directory, max); assert.ok(result.path);
    assert.ok(Buffer.byteLength(result.text) <= max); assert.ok(!result.text.includes("�"));
    assert.match(result.text, /ERROR src\/parser.ts:42/); assert.match(result.text, /Exit status: 1/);
    assert.match(result.text, /output excerpt/); assert.equal(await readFile(result.path, "utf8"), largeText);
    if (process.platform !== "win32") assert.equal((await stat(result.path)).mode & 0o777, 0o600);
  }
  const small = await budgetToolOutput("small", directory); assert.equal(small.path, null); assert.equal(small.text, "small");
  const together = await Promise.all([budgetToolOutput(largeText, directory), budgetToolOutput(largeText, directory)]);
  assert.equal(together[0].path, together[1].path); assert.ok((await readdir(directory)).every((name) => !name.endsWith(".tmp")));
});

test("Claude's pre-model hook rewrites only known text shapes and preserves shell outcome metadata", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-claude-output-")); t.after(() => rm(directory, { recursive: true, force: true }));
  const hook = createClaudeOutputHook(directory); const options = { signal: new AbortController().signal };
  const result = await hook({ ...hookInput, tool_response: { stdout: largeText, stderr: "diagnostic stderr", interrupted: false, exitCode: 1 } }, "tool", options);
  assert.ok("hookSpecificOutput" in result && result.hookSpecificOutput?.hookEventName === "PostToolUse");
  const shell = rewrittenShellSchema.parse(result.hookSpecificOutput.updatedToolOutput);
  assert.equal(shell.exitCode, 1); assert.equal(shell.stderr, "diagnostic stderr"); assert.equal(shell.interrupted, false);
  assert.ok(Buffer.byteLength(shell.stdout) + Buffer.byteLength(shell.stderr) <= 8_000);
  for (const tool_response of [
    { stdout: "small", stderr: "", interrupted: false },
    { stdout: largeText, stderr: "", interrupted: false, isImage: true },
    { stdout: largeText, stderr: "", interrupted: true },
    { stdout: largeText, stderr: "", interrupted: false, structuredContent: [{ type: "image" }] },
    { stdout: largeText, stderr: "", interrupted: false, persistedOutputPath: "/native/full.txt" },
  ]) assert.deepEqual(await hook({ ...hookInput, tool_response }, "tool", options), {});
  const mcp = await hook({ ...hookInput, tool_name: "mcp__logs__report", tool_response: { content: [{ type: "text", text: largeText }], isError: false } }, "tool", options);
  assert.ok("hookSpecificOutput" in mcp && mcp.hookSpecificOutput?.hookEventName === "PostToolUse");
  assert.ok(z.object({ content: z.array(z.object({ text: z.string() })) }).parse(mcp.hookSpecificOutput.updatedToolOutput).content[0].text.includes("Full output"));
  for (const tool_response of [
    { content: [{ type: "text", text: largeText }], structuredContent: { data: largeText } },
    { content: [{ type: "image", data: "binary", mimeType: "image/png" }] },
    { content: [{ type: "text", text: largeText }], isError: true },
    { content: [{ type: "text", text: largeText, annotations: { audience: ["user"] } }] },
  ]) assert.deepEqual(await hook({ ...hookInput, tool_name: "mcp__logs__report", tool_response }, "tool", options), {});
  assert.deepEqual(await hook({ ...hookInput, tool_name: "Read", tool_response: largeText }, "tool", options), {});
  assert.deepEqual(claudeOutputOptions({ directory, enabled: () => false }), {});
  assert.ok(claudeOutputOptions({ directory, enabled: () => true }).hooks?.PostToolUse?.length);
});

test("storage failures and cancelled hooks retain original results", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-output-failure-")); t.after(() => rm(directory, { recursive: true, force: true }));
  const occupied = join(directory, "file"); await writeFile(occupied, "occupied");
  const input = { ...hookInput, tool_response: { stdout: largeText, stderr: "", interrupted: false } };
  assert.deepEqual(await createClaudeOutputHook(occupied)(input, "tool", { signal: new AbortController().signal }), {});
  const controller = new AbortController(); controller.abort();
  assert.deepEqual(await createClaudeOutputHook(directory)(input, "tool", { signal: controller.signal }), {});
});

test("Codex uses its native output budget, preserves stricter limits and falls back to defaults on incompatible runtimes", async () => {
  let limit: number | null = 10_000, calls = 0;
  const rpc: Pick<StdioRpc, "request"> = { async request(method, params, schema) {
    calls++; assert.equal(method, "config/read"); assert.deepEqual(params, { cwd: "/project", includeLayers: false });
    return schema.parse({ config: { tool_output_token_limit: limit } });
  } };
  assert.deepEqual(await codexOutputConfig(rpc, "/project", false), {}); assert.equal(calls, 0);
  assert.deepEqual(await codexOutputConfig(rpc, "/project", true), { tool_output_token_limit: 2_000 });
  limit = 500; assert.deepEqual(await codexOutputConfig(rpc, "/project", true), { tool_output_token_limit: 500 });
  limit = null; assert.deepEqual(await codexOutputConfig(rpc, "/project", true), { tool_output_token_limit: 2_000 });
  assert.deepEqual(await codexOutputConfig({ async request() { throw new Error("method not found"); } }, "/project", true), {});
});
