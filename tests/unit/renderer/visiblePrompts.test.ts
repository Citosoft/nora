import assert from "node:assert/strict";
import test from "node:test";
import { visiblePrompts } from "@/components/app/logic/transcript-history/visiblePrompts";

const prompts = [
  { id: "first", text: "Explain this", top: 20 },
  { id: "second", text: "Make the change", top: 1000 },
  { id: "third", text: "Verify it", top: 1300 }
];

test("history highlights a prompt while reading a long reply below it", () => {
  assert.deepEqual(visiblePrompts(prompts, 500, 300, 2000), ["first"]);
});

test("history highlights every turn intersecting the viewport", () => {
  assert.deepEqual(visiblePrompts(prompts, 900, 500, 2000), ["first", "second", "third"]);
});

test("history excludes turns exactly outside viewport edges", () => {
  assert.deepEqual(visiblePrompts(prompts, 1000, 300, 2000), ["second"]);
});

test("history keeps the last prompt highlighted through the final reply", () => {
  assert.deepEqual(visiblePrompts(prompts, 1700, 300, 2000), ["third"]);
});

test("empty and hidden transcripts have no highlighted prompts", () => {
  assert.deepEqual(visiblePrompts([], 0, 300, 300), []);
  assert.deepEqual(visiblePrompts(prompts, 0, 0, 2000), []);
});
