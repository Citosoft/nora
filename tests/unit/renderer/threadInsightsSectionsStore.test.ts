import assert from "node:assert/strict";
import test from "node:test";
import { parseHiddenSections, readHiddenSections, subscribeHiddenSections, toggleHiddenSection, writeHiddenSections } from "@/components/app/logic/threadInsightsSectionsStore";

test("parseHiddenSections keeps known section IDs and tolerates bad storage", () => {
  assert.deepEqual([...parseHiddenSections(JSON.stringify(["skills", "retired-section", 4, "branch"]))], ["skills", "branch"]);
  assert.equal(parseHiddenSections("{not json").size, 0);
  assert.equal(parseHiddenSections(JSON.stringify({ skills: true })).size, 0);
  assert.equal(parseHiddenSections(null).size, 0);
});

test("toggleHiddenSection flips one section without mutating the input", () => {
  const initial = new Set(["skills"] as const);
  const hidden = toggleHiddenSection(initial, "outputs");
  assert.deepEqual([...hidden].sort(), ["outputs", "skills"]);
  assert.deepEqual([...toggleHiddenSection(hidden, "skills")], ["outputs"]);
  assert.deepEqual([...initial], ["skills"]);
});

test("writeHiddenSections persists and notifies every subscribed panel", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true,
    value: { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } } });
  let notified = 0;
  const unsubscribe = subscribeHiddenSections(() => { notified += 1; });
  writeHiddenSections(new Set(["changes"]));
  unsubscribe();
  writeHiddenSections(new Set(["changes", "overview"]));
  assert.equal(notified, 1);
  assert.deepEqual([...readHiddenSections()], ["changes", "overview"]);
  assert.deepEqual(JSON.parse(values.get("nora-thread-insights-hidden-sections") ?? "[]"), ["changes", "overview"]);
});
