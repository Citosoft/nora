import {
  decodeChatModelChoice,
  encodeChatModelChoice,
  listModelsForAiChatSelector
} from "@/components/app/logic/aiChatSelection";
import assert from "node:assert/strict";
import test from "node:test";

test("encodeChatModelChoice and decodeChatModelChoice round-trip", () => {
  const value = encodeChatModelChoice("openai", "gpt-4o-mini");
  assert.deepEqual(decodeChatModelChoice(value), { provider: "openai", model: "gpt-4o-mini" });
});

test("decodeChatModelChoice returns null for invalid payloads", () => {
  assert.equal(decodeChatModelChoice(""), null);
  assert.equal(decodeChatModelChoice("{}"), null);
  assert.equal(decodeChatModelChoice('["openai"]'), null);
  assert.equal(decodeChatModelChoice('["unknown","m"]'), null);
  assert.equal(decodeChatModelChoice('["openai",""]'), null);
});

test("listModelsForAiChatSelector returns empty when API key missing", () => {
  assert.deepEqual(listModelsForAiChatSelector("anthropic", "", [{ id: "claude-3", releasedAtMs: 1 }], "", "claude-default"), []);
});

test("listModelsForAiChatSelector orders by releasedAtMs newest first", () => {
  assert.deepEqual(
    listModelsForAiChatSelector(
      "openai",
      "k",
      [
        { id: "a", releasedAtMs: 1000 },
        { id: "c", releasedAtMs: 3000 },
        { id: "b", releasedAtMs: 2000 }
      ],
      "",
      "fallback"
    ),
    [
      { id: "c", releasedAtMs: 3000 },
      { id: "b", releasedAtMs: 2000 },
      { id: "a", releasedAtMs: 1000 }
    ]
  );
});

test("listModelsForAiChatSelector merges saved id and sorts by date", () => {
  assert.deepEqual(
    listModelsForAiChatSelector(
      "openai",
      "k",
      [
        { id: "z", releasedAtMs: 2000 },
        { id: "a", releasedAtMs: 1000 }
      ],
      "custom",
      "fallback"
    ),
    [{ id: "z", releasedAtMs: 2000 }, { id: "a", releasedAtMs: 1000 }, { id: "custom" }]
  );
});

test("listModelsForAiChatSelector keeps five newest by releasedAtMs", () => {
  const listed = [1, 2, 3, 4, 5, 6].map((i) => ({ id: `m-${i}`, releasedAtMs: i * 1000 }));
  assert.deepEqual(listModelsForAiChatSelector("openai", "k", listed, "", "fallback"), [
    { id: "m-6", releasedAtMs: 6000 },
    { id: "m-5", releasedAtMs: 5000 },
    { id: "m-4", releasedAtMs: 4000 },
    { id: "m-3", releasedAtMs: 3000 },
    { id: "m-2", releasedAtMs: 2000 }
  ]);
});

test("listModelsForAiChatSelector pins saved model when outside top five by date", () => {
  const listed = [1, 2, 3, 4, 5, 6].map((i) => ({ id: `m-${i}`, releasedAtMs: i * 1000 }));
  assert.deepEqual(listModelsForAiChatSelector("openai", "k", listed, "m-1", "fallback"), [
    { id: "m-1", releasedAtMs: 1000 },
    { id: "m-6", releasedAtMs: 6000 },
    { id: "m-5", releasedAtMs: 5000 },
    { id: "m-4", releasedAtMs: 4000 },
    { id: "m-3", releasedAtMs: 3000 }
  ]);
});

test("listModelsForAiChatSelector falls back when list empty", () => {
  assert.deepEqual(listModelsForAiChatSelector("google", "k", [], "", "gemini-flash"), [{ id: "gemini-flash" }]);
  assert.deepEqual(listModelsForAiChatSelector("google", "k", [], "saved-only", "gemini-flash"), [{ id: "saved-only" }]);
});
