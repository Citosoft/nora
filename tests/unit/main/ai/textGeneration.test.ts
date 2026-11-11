import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import type { AiSimpleTaskProvider, ChangeEntry } from "@shared/appTypes";
import type { TextGenerationRequest, TextGenerators } from "@main/types/ai/textGeneration.types";
import { generateSimpleText } from "@main/ai/simpleTextGeneration";
import { generateCommitMessageFromChanges } from "@main/ai/commitMessageGenerator";
import { generateThreadName } from "@main/ai/threadNameGenerator";
import { parseCodexText } from "@main/providers/codex/textGeneration";

const request: TextGenerationRequest = { system: "Return a name", user: "Some changes" };
const change: ChangeEntry = { path: "main/example.ts", status: "modified", additions: 1, deletions: 0, diff: "+const enabled = true;" };

function sources(text = "Add runtime generation") {
  const calls: string[] = [];
  const prompts: TextGenerationRequest[] = [];
  const generators: TextGenerators = {
    cloud: async (_settings, prompt) => { calls.push("cloud"); prompts.push(prompt); return { text, provider: "openai" }; },
    local: async (_model, prompt) => { calls.push("local"); prompts.push(prompt); return text; },
    runtime: async (provider, prompt) => { calls.push(provider); prompts.push(prompt); return text; }
  };
  return { calls, prompts, generators };
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

test("Codex JSONL requires a successful completed turn and a final assistant message", () => {
  const message = JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: " Add runtime generation " } });
  const complete = JSON.stringify({ type: "turn.completed", usage: { input_tokens: 10 } });
  assert.equal(parseCodexText(`${message}\n${complete}\n`), "Add runtime generation");
  assert.throws(() => parseCodexText(message), /no completed text/);
  assert.throws(() => parseCodexText(`${message}\n{"type":"turn.failed"}`), /failed/);
  assert.throws(() => parseCodexText(complete), /no completed text/);
  assert.throws(() => parseCodexText("not json"));
});
