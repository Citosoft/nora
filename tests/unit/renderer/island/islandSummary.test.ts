import assert from "node:assert/strict";
import test from "node:test";
import { islandAvatarState, islandIdentityName, islandOverflow, islandSummary } from "@/components/app/logic/island/islandSummary";
import { islandDemoNotice } from "@/components/app/logic/island/islandDemoNotice";

test("the summary lists only phases with work, most urgent first", () => {
  assert.equal(islandSummary({ waiting: 1, running: 2, queued: 0, total: 3 }), "1 needs you · 2 running");
  assert.equal(islandSummary({ waiting: 0, running: 0, queued: 4, total: 4 }), "4 queued");
});

test("rows map to bot face states and overflow counts unlisted work", () => {
  assert.deepEqual((["waiting", "running", "queued"] as const).map(islandAvatarState), ["waiting", "thinking", "idle"]);
  assert.equal(islandOverflow({ waiting: 0, running: 7, queued: 0, total: 7 }, 5), 2);
  assert.equal(islandOverflow({ waiting: 0, running: 2, queued: 0, total: 2 }, 2), 0);
});

test("a preview that showed needs no notice; one that could not explains why", () => {
  assert.equal(islandDemoNotice("shown"), null);
  assert.match(islandDemoNotice("no-notch")?.title ?? "", /No notch/);
  assert.match(islandDemoNotice("unsupported")?.title ?? "", /macOS only/);
});

test("the collapsed island names the bot, or else the provider", () => {
  assert.equal(islandIdentityName({ kind: "bot", name: "Reviewer", avatar: { seed: 1 } }), "Reviewer");
  assert.equal(islandIdentityName({ kind: "provider", toolId: "codex", label: "Codex", connection: "unknown" }), "Codex");
});
