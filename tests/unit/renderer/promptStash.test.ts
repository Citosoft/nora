import assert from "node:assert/strict";
import test from "node:test";
import { isPromptStashShortcut, pushStashedPrompt, removeStashedPrompt, takeStashedPrompt, togglePromptStash } from "@/components/app/logic/composer-prompts/promptStash";
import type { StashedPrompt } from "@/components/app/types/composerPrompts.types";

const NOW = "2026-11-18T10:00:00.000Z";
const ids = () => { let next = 0; return () => `stash-${++next}`; };
const entry = (id: string, text: string): StashedPrompt => ({ id, text, stashedAt: "2026-11-17T09:00:00.000Z" });

test("the shortcut stashes a draft and clears the composer", () => {
  assert.deepEqual(togglePromptStash([entry("a", "older")], "draft", NOW, ids()), {
    stash: [{ id: "stash-1", text: "draft", stashedAt: NOW }, entry("a", "older")], text: ""
  });
});

test("the shortcut on an empty composer restores the newest stash", () => {
  assert.deepEqual(togglePromptStash([entry("a", "newest"), entry("b", "older")], "  ", NOW, ids()), { stash: [entry("b", "older")], text: "newest" });
  assert.equal(togglePromptStash([], "", NOW, ids()), null);
});

test("restoring into a composer with a draft stashes that draft instead of losing it", () => {
  assert.deepEqual(takeStashedPrompt([entry("a", "one"), entry("b", "two")], "b", "current", NOW, ids()), {
    stash: [{ id: "stash-1", text: "current", stashedAt: NOW }, entry("a", "one")], text: "two"
  });
  assert.equal(takeStashedPrompt([entry("a", "one")], "missing", "", NOW, ids()), null);
});

test("blank drafts are not stashed and entries can be deleted", () => {
  const stash = [entry("a", "one")];
  assert.equal(pushStashedPrompt(stash, " \n", NOW, ids()), stash);
  assert.deepEqual(removeStashedPrompt([entry("a", "one"), entry("b", "two")], "a"), [entry("b", "two")]);
});

test("Cmd or Ctrl+S is the stash shortcut, without Shift or Alt", () => {
  const keys = { key: "s", shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };
  assert.equal(isPromptStashShortcut({ ...keys, metaKey: true }), true);
  assert.equal(isPromptStashShortcut({ ...keys, ctrlKey: true, key: "S" }), true);
  assert.equal(isPromptStashShortcut({ ...keys, metaKey: true, shiftKey: true }), false);
  assert.equal(isPromptStashShortcut(keys), false);
});
