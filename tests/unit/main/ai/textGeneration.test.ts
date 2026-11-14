import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import type { AiSimpleTaskProvider, ChangeEntry } from "@shared/appTypes";
import type { TextGenerationRequest, TextGenerators } from "@main/types/ai/textGeneration.types";
import { generateMemoryReviewText, generateSimpleText } from "@main/ai/simpleTextGeneration";
import { generateCommitMessageFromChanges } from "@main/ai/commitMessageGenerator";
import { generateThreadName } from "@main/ai/threadNameGenerator";
import { parseCodexOutput } from "@main/providers/codex/textGeneration";

const request: TextGenerationRequest = { system: "Return a name", user: "Some changes" };
const change: ChangeEntry = { path: "main/example.ts", status: "modified", additions: 1, deletions: 0, diff: "+const enabled = true;" };

function sources(text = "Add runtime generation") {
  const calls: string[] = [];
  const prompts: TextGenerationRequest[] = [];
  const models: (string | null)[] = [];
  const generators: TextGenerators = {
    cloud: async (_settings, prompt) => { calls.push("cloud"); prompts.push(prompt); return { text, provider: "openai", model: "gpt-4o-mini", usage: null }; },
    local: async (_model, prompt) => { calls.push("local"); prompts.push(prompt); return text; },
    runtime: async (provider, prompt, model) => { calls.push(provider); prompts.push(prompt); models.push(model); return { text, model, usage: { inputTokens: 10, outputTokens: 2 } }; }
  };
  return { calls, prompts, models, generators };
}

for (const provider of ["cloud", "local", "codex", "claude"] satisfies AiSimpleTaskProvider[]) {
  test(`${provider} is selected explicitly for both commit messages and thread names`, async () => {
    const fake = sources();
    const settings = { ...DEFAULT_APP_SETTINGS, ai: { ...DEFAULT_APP_SETTINGS.ai, simpleTaskProvider: provider } };
    const commit = await generateCommitMessageFromChanges(settings, [change], fake.generators);
    assert.equal(commit.message, "Add runtime generation");
    assert.equal(commit.provider, provider === "cloud" ? "openai" : provider);
    assert.equal(await generateThreadName(settings.ai, "Add runtime support", undefined, fake.generators), "Add runtime generation");
    assert.deepEqual(fake.calls, [provider, provider]);
    assert.match(fake.prompts[0].user, provider === "local" ? /Primary files:/ : /Diff context:/);
    assert.match(fake.prompts[1].system, /Do not carry out the task/);
  });
}

test("runtime failures never fall back to an API key or another account", async () => {
  const fake = sources();
  fake.generators.runtime = async () => { throw new Error("Sign-in required"); };
  await assert.rejects(generateSimpleText({ ...DEFAULT_APP_SETTINGS.ai, simpleTaskProvider: "codex" }, request, fake.generators), /Sign-in required/);
  assert.deepEqual(fake.calls, []);
});

test("commit generation validates changes and normalizes a runtime subject", async () => {
  const fake = sources('Commit message: "Add runtime generation"\nExtra explanation');
  const settings = { ...DEFAULT_APP_SETTINGS, ai: { ...DEFAULT_APP_SETTINGS.ai, simpleTaskProvider: "claude" as const } };
  await assert.rejects(generateCommitMessageFromChanges(settings, [], fake.generators), /No selected changes/);
  assert.equal((await generateCommitMessageFromChanges(settings, [change], fake.generators)).message, "Add runtime generation");
});

test("thread names are cleaned, bounded and receive cancellation", async () => {
  const fake = sources('Title: "Runtime generation"\nExplanation');
  const controller = new AbortController();
  assert.equal(await generateThreadName(DEFAULT_APP_SETTINGS.ai, "x".repeat(8000), controller.signal, fake.generators), "Runtime generation");
  assert.equal(fake.prompts[0].signal, controller.signal);
  assert.equal(fake.prompts[0].user.length, "Opening message:\n".length + 6000);
  const long = sources("x".repeat(100));
  assert.equal((await generateThreadName(DEFAULT_APP_SETTINGS.ai, "prompt", undefined, long.generators)).length, 60);
  const empty = sources("  \n");
  await assert.rejects(generateThreadName(DEFAULT_APP_SETTINGS.ai, "prompt", undefined, empty.generators), /did not include/);
});

test("Codex JSONL requires a successful completed turn and a final assistant message, and reports its usage", () => {
  const message = JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: " Add runtime generation " } });
  const complete = JSON.stringify({ type: "turn.completed", usage: { input_tokens: 10 } });
  assert.deepEqual(parseCodexOutput(`${message}\n${complete}\n`), { text: "Add runtime generation", usage: { inputTokens: 10, outputTokens: 0 } });
  const full = JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1200, cached_input_tokens: 800, output_tokens: 40 } });
  assert.deepEqual(parseCodexOutput(`${message}\n${full}`).usage, { inputTokens: 1200, outputTokens: 40 });
  assert.equal(parseCodexOutput(`${message}\n${JSON.stringify({ type: "turn.completed", usage: "odd" })}`).usage, null);
  assert.throws(() => parseCodexOutput(message), /no completed text/);
  assert.throws(() => parseCodexOutput(`${message}\n{"type":"turn.failed"}`), /failed/);
  assert.throws(() => parseCodexOutput(complete), /no completed text/);
  assert.throws(() => parseCodexOutput("not json"));
});

test("simple tasks and memory reviews each use their own source and runtime model, and report usage", async () => {
  const fake = sources();
  const ai = { ...DEFAULT_APP_SETTINGS.ai, simpleTaskProvider: "codex" as const, runtimeModelByProvider: { codex: "gpt-5-mini", claude: null },
    memoryReview: { provider: "claude" as const, runtimeModel: "claude-sonnet-5-5" } };
  const simple = await generateSimpleText(ai, request, fake.generators);
  const review = await generateMemoryReviewText(ai, request, fake.generators);
  assert.deepEqual(fake.calls, ["codex", "claude"]);
  assert.deepEqual(fake.models, ["gpt-5-mini", "claude-sonnet-5-5"]);
  assert.deepEqual([simple.provider, review.provider, review.model, review.usage], ["codex", "claude", "claude-sonnet-5-5", { inputTokens: 10, outputTokens: 2 }]);
  const cloud = await generateMemoryReviewText({ ...ai, simpleTaskProvider: "local", memoryReview: { provider: "cloud", runtimeModel: null } }, request, fake.generators);
  assert.deepEqual([cloud.provider, fake.calls.at(-1)], ["openai", "cloud"]);
});
