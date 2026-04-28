import { buildWorkspaceChatProviderOptions } from "@/components/app/ai/workspaceChatProviderOptions";
import assert from "node:assert/strict";
import test from "node:test";

test("buildWorkspaceChatProviderOptions returns undefined when off", () => {
  assert.equal(buildWorkspaceChatProviderOptions("openai", "off"), undefined);
  assert.equal(buildWorkspaceChatProviderOptions("anthropic", "off"), undefined);
  assert.equal(buildWorkspaceChatProviderOptions("google", "off"), undefined);
});

test("buildWorkspaceChatProviderOptions maps OpenAI reasoning effort to level names", () => {
  assert.deepEqual(buildWorkspaceChatProviderOptions("openai", "low"), { openai: { reasoningEffort: "low" } });
  assert.deepEqual(buildWorkspaceChatProviderOptions("openai", "xhigh"), { openai: { reasoningEffort: "xhigh" } });
});

test("buildWorkspaceChatProviderOptions maps Gemini xhigh to high thinking level", () => {
  assert.deepEqual(buildWorkspaceChatProviderOptions("google", "xhigh"), {
    google: { thinkingConfig: { thinkingLevel: "high" } }
  });
  assert.deepEqual(buildWorkspaceChatProviderOptions("google", "low"), {
    google: { thinkingConfig: { thinkingLevel: "low" } }
  });
});

test("buildWorkspaceChatProviderOptions increases Anthropic budget with level", () => {
  const low = buildWorkspaceChatProviderOptions("anthropic", "low") as {
    anthropic: { thinking: { budgetTokens: number }; sendReasoning: boolean };
  };
  const high = buildWorkspaceChatProviderOptions("anthropic", "high") as {
    anthropic: { thinking: { budgetTokens: number }; sendReasoning: boolean };
  };
  assert.ok(low.anthropic.thinking.budgetTokens < high.anthropic.thinking.budgetTokens);
  assert.equal(low.anthropic.sendReasoning, true);
});
