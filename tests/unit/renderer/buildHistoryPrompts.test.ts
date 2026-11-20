import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoryPrompts } from "@/components/app/logic/transcript-history/buildHistoryPrompts";

test("history pairs each input with its last assistant output", () => {
  const first = { id: "one", text: "Fix it", top: 20 };
  const second = { id: "two", text: "Check it", top: 1000 };
  assert.deepEqual(buildHistoryPrompts([
    { kind: "output", text: "Earlier unloaded context" },
    { kind: "prompt", prompt: first },
    { kind: "output", text: "Working on it" },
    { kind: "output", text: "Fixed" },
    { kind: "output", text: "   " },
    { kind: "prompt", prompt: second },
    { kind: "output", text: "Checks pass" }
  ]), [{ ...first, output: "Fixed" }, { ...second, output: "Checks pass" }]);
});

test("a prompt with no reply does not borrow the previous turn's output", () => {
  assert.deepEqual(buildHistoryPrompts([
    { kind: "prompt", prompt: { id: "one", text: "Hello", top: 0 } },
    { kind: "output", text: "Hi" },
    { kind: "prompt", prompt: { id: "two", text: "Next", top: 100 } }
  ]).map((prompt) => prompt.output), ["Hi", null]);
  assert.deepEqual(buildHistoryPrompts([]), []);
});
