import assert from "node:assert/strict";
import test from "node:test";
import { appendPromptHistory, IDLE_PROMPT_RECALL, stepPromptRecall } from "@/components/app/logic/composer-prompts/promptHistory";
import { parseStoredList } from "@/components/app/logic/composer-prompts/storedList";
import type { PromptRecall, PromptRecallDirection } from "@/components/app/types/composerPrompts.types";

const history = ["newest", "middle", "oldest"];
const step = (recall: PromptRecall, text: string, direction: PromptRecallDirection, caret = text.length) =>
  stepPromptRecall({ history, recall, text, caret, direction });

test("sent prompts go to the front without repeats, and blank prompts are ignored", () => {
  assert.deepEqual(appendPromptHistory(["b", "a"], "c"), ["c", "b", "a"]);
  assert.deepEqual(appendPromptHistory(["b", "a"], "a"), ["a", "b"]);
  const entries = ["b", "a"];
  assert.equal(appendPromptHistory(entries, "  \n"), entries);
  assert.deepEqual(appendPromptHistory(["b", "a"], "c", 2), ["c", "b"]);
});

test("Up from an empty composer walks back through history, stopping at the oldest", () => {
  const first = step(IDLE_PROMPT_RECALL, "", "older");
  assert.deepEqual(first, { recall: { index: 0, draft: "" }, text: "newest" });
  const second = step(first!.recall, "newest", "older");
  assert.deepEqual(second?.text, "middle");
  const third = step(second!.recall, "middle", "older");
  assert.equal(third?.text, "oldest");
  assert.equal(step(third!.recall, "oldest", "older"), null);
});

test("Down walks forward and finally restores the draft you were typing", () => {
  const recalled = step(IDLE_PROMPT_RECALL, "half typed", "older", 0);
  assert.deepEqual(recalled, { recall: { index: 0, draft: "half typed" }, text: "newest" });
  const back = step(recalled!.recall, "newest", "newer");
  assert.deepEqual(back, { recall: IDLE_PROMPT_RECALL, text: "half typed" });
  assert.equal(step(back!.recall, "half typed", "newer"), null);
});

test("Up only recalls from a draft when the caret is at its start", () => {
  assert.equal(step(IDLE_PROMPT_RECALL, "line one\nline two", "older", 12), null);
  assert.equal(step(IDLE_PROMPT_RECALL, "draft", "older", 0)?.text, "newest");
});

test("editing a recalled prompt makes it the draft, so arrows move the caret again", () => {
  const recalled = { index: 1, draft: "" };
  assert.equal(step(recalled, "middle edited", "newer"), null);
  assert.equal(step(recalled, "middle edited", "older", 4), null);
  assert.deepEqual(step(recalled, "middle edited", "older", 0), { recall: { index: 0, draft: "middle edited" }, text: "newest" });
});

test("stored lists keep only entries that parse, within the limit", () => {
  const text = (entry: unknown) => typeof entry === "string" ? entry : null;
  assert.deepEqual(parseStoredList(JSON.stringify(["a", 1, "b", "c"]), text, 2), ["a", "b"]);
  assert.deepEqual(parseStoredList("{not json", text, 5), []);
  assert.deepEqual(parseStoredList(JSON.stringify({ a: 1 }), text, 5), []);
  assert.deepEqual(parseStoredList(null, text, 5), []);
});
