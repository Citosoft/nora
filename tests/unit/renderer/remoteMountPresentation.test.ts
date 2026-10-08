import { formatRemoteMountBadgeLabel, formatRemoteMountTarget } from "@/components/app/logic/remoteMountPresentation";
import type { ActiveRemoteMount } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createMount(overrides: Partial<ActiveRemoteMount>): ActiveRemoteMount {
  return { remote: "box:/srv", localMount: null, host: null, user: null, port: null, remotePath: null, ...overrides };
}

test("formatRemoteMountBadgeLabel uses the last path segment, ignoring trailing separators", () => {
  assert.equal(formatRemoteMountBadgeLabel("/Users/me/mounts/box/"), "box");
  assert.equal(formatRemoteMountBadgeLabel("C:\\mounts\\box\\"), "box");
  assert.equal(formatRemoteMountBadgeLabel(null), "Ssh");
});

test("formatRemoteMountTarget prefers user@host and falls back to the remote spec", () => {
  assert.equal(formatRemoteMountTarget(createMount({ user: "dev", host: "box.local" })), "dev@box.local");
  assert.equal(formatRemoteMountTarget(createMount({})), "box:/srv");
});
