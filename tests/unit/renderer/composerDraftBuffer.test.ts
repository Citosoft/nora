import assert from "node:assert/strict";
import test from "node:test";
import { createComposerDraftBuffer } from "@/components/app/logic/composerDraftBuffer";

test("typing displays immediately and coalesces persistence until typing pauses", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const saved: string[] = [], shown: string[] = [];
  const buffer = createComposerDraftBuffer({ value: "", publish: (text) => saved.push(text), display: (text) => shown.push(text) });
  buffer.edit("a");
  context.mock.timers.tick(100);
  buffer.edit("ab");
  assert.deepEqual(shown, ["a", "ab"]);
  assert.deepEqual(saved, []);
  context.mock.timers.tick(199);
  assert.deepEqual(saved, []);
  context.mock.timers.tick(1);
  assert.deepEqual(saved, ["ab"]);
});

test("send or unmount flushes the newest edit once and cancels the trailing save", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const saved: string[] = [];
  const buffer = createComposerDraftBuffer({ value: "", publish: (text) => saved.push(text), display: () => {} });
  buffer.edit("send this now");
  buffer.flush();
  assert.deepEqual(saved, ["send this now"]);
  buffer.edit("another edit");
  buffer.dispose();
  context.mock.timers.tick(1000);
  assert.deepEqual(saved, ["send this now", "another edit"]);
});

test("acknowledgements preserve newer typing while external replacements cancel pending saves", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const saved: string[] = [], shown: string[] = [];
  const buffer = createComposerDraftBuffer({ value: "", publish: (text) => saved.push(text), display: (text) => shown.push(text) });
  buffer.edit("first");
  buffer.flush();
  buffer.edit("newer");
  buffer.receive("first");
  assert.equal(shown.at(-1), "newer");
  buffer.receive("");
  assert.equal(shown.at(-1), "");
  context.mock.timers.tick(1000);
  buffer.flush();
  assert.deepEqual(saved, ["first"]);
});
